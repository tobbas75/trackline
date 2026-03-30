import { type NextRequest, NextResponse } from "next/server";
import { apiGuard, withSecurityHeaders } from "@/lib/api-security";
import { getJob } from "@/lib/sentinel-jobs";

/**
 * Sentinel imagery job status endpoint.
 * Client polls this while dMIBR processing runs in the background.
 *
 * GET /api/sentinel/imagery/status?jobId=xxx
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, {
    methods: ["GET"],
    rateLimit: { maxRequests: 60, windowMs: 60_000 },
  });
  if (guard) return guard;

  const jobId = new URL(request.url).searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId parameter is required" }, { status: 400 });
  }

  const job = getJob(jobId);

  if (!job) {
    const resp = NextResponse.json(
      { jobId, status: "not_found" },
      { status: 404 }
    );
    return withSecurityHeaders(resp);
  }

  const resp = NextResponse.json(
    {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      step: job.step,
      totalSteps: job.totalSteps,
      ...(job.error ? { error: job.error } : {}),
    },
    {
      status: job.status === "error" ? 500 : 200,
      headers: {
        // No caching — always fresh status
        "Cache-Control": "no-store",
      },
    }
  );
  return withSecurityHeaders(resp);
}
