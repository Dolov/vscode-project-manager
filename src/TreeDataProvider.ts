import * as vscode from 'vscode';
import { ProjectItemProps, getBranchName, store } from './utils'

export class CurrentProvider implements vscode.TreeDataProvider<Project> {

	private _onDidChangeTreeData: vscode.EventEmitter<Project | undefined | null | void> = new vscode.EventEmitter<Project | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Project | undefined | null | void> = this._onDidChangeTreeData.event;

  async refresh() {
		this._onDidChangeTreeData.fire();
  }

	constructor(private workspaceRoot: string | undefined) {
	}

	getTreeItem(element: Project): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Project): Thenable<Project[]> {
    const favorites: ProjectItemProps[] = store.favorite
		return new Promise(async resolve => {
			const items = store.current.map(item => {
				return new Project(item, favorites)
			})
			resolve(items)
		})
	}
}


export class FavoriteProvider implements vscode.TreeDataProvider<Project> {

	private _onDidChangeTreeData: vscode.EventEmitter<Project | undefined | null | void> = new vscode.EventEmitter<Project | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Project | undefined | null | void> = this._onDidChangeTreeData.event;

  async refresh() {
    this._onDidChangeTreeData.fire();
  }

	constructor(private workspaceRoot: string | undefined) {
	}

	getTreeItem(element: Project): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Project): Thenable<Project[]> {
    return new Promise(async resolve => {
			const projects: ProjectItemProps[] = store.favorite
			const items = projects.map(itemc => {
				const { path } = itemc
				const branchName = getBranchName(path)
				return new Project({
					...itemc,
					branchName,
				}, projects)
			})
			resolve(items)
		})
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
