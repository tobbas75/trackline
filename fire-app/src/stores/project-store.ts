import { create } from "zustand";
import type { Database } from "@/lib/supabase/types";

type Project = Database["public"]["Tables"]["project"]["Row"];

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setLoading: (isLoading) => set({ isLoading }),
}));
