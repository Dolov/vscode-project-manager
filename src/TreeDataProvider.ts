import * as vscode from 'vscode';
import { ProjectItemProps, getCurrentProjects, getConfig } from './utils'

export class TreeDataProvider implements vscode.TreeDataProvider<Project> {

	private _onDidChangeTreeData: vscode.EventEmitter<Project | undefined | null | void> = new vscode.EventEmitter<Project | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Project | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  type: "current" | "favorite"
	context: vscode.ExtensionContext

	constructor(private workspaceRoot: string | undefined, context: vscode.ExtensionContext, type: "current" | "favorite") {
		this.type = type
		this.context = context
	}

	getTreeItem(element: Project): vscode.TreeItem {
		return element;
	}

  getCurrentTreeData(): Thenable<Project[]> {
    const config: ProjectItemProps[] = getConfig(this.context)
		return new Promise(async resolve => {
			const projects: ProjectItemProps[] = await getCurrentProjects()
			const items = projects.map(item => {
				return new Project(item, config)
			})
			resolve(items)
		})
  }

  getFavoriteTreeData(): Thenable<Project[]> {
    return new Promise(async resolve => {
			const projects: ProjectItemProps[] = getConfig(this.context)
			const items = projects.map(item => {
				return new Project(item, projects)
			})
			resolve(items)
		})
  }

	getChildren(element?: Project): Thenable<Project[]> {
    if (this.type === "current") {
      return this.getCurrentTreeData()
    }
    return this.getFavoriteTreeData()
	}
}

export class Project extends vscode.TreeItem {

	contextValue = "favorite"

	constructor(
		public readonly item: ProjectItemProps,
		public readonly config: ProjectItemProps[]
	) {
		const { path, name, branchName } = item
		super(name);
		this.iconPath = new vscode.ThemeIcon('folder');
		this.tooltip = `${name}`;

		this.description = branchName;
		this.command = {
			title: 'Open Project',
			command: 'project-manager.openProject',
			arguments: [item]
		}

		const target = config.find(item => item.path === path)
		if (target) {
			this.contextValue = "favorited"
		}
	}
}
