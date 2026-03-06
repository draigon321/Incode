from __future__ import annotations

from copy import deepcopy

from .models import Project


class ProjectStore:
    def __init__(self) -> None:
        self._projects: dict[str, Project] = {}

    def set(self, project: Project) -> None:
        self._projects[project.id] = deepcopy(project)

    def get(self, project_id: str) -> Project | None:
        project = self._projects.get(project_id)
        if project is None:
            return None
        return deepcopy(project)

    def update(self, project_id: str, project: Project) -> None:
        self._projects[project_id] = deepcopy(project)
