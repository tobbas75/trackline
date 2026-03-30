"use client";

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectStore } from "@/stores/project-store";
import { MOCK_PROJECTS } from "@/lib/mock-data";

export function ProjectSelector() {
  const { projects, activeProject, setProjects, setActiveProject } =
    useProjectStore();

  // Load projects on mount (mock data for now)
  useEffect(() => {
    if (projects.length === 0) {
      setProjects(MOCK_PROJECTS);
      if (!activeProject && MOCK_PROJECTS.length > 0) {
        setActiveProject(MOCK_PROJECTS[0]);
      }
    }
  }, [projects.length, activeProject, setProjects, setActiveProject]);

  function handleChange(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    setActiveProject(project ?? null);
  }

  return (
    <Select
      value={activeProject?.id ?? ""}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select project" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
