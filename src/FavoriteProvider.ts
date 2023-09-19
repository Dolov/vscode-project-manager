import * as vscode from 'vscode';
import { ProjectItemProps, getConfig } from './utils'

export class FavoriteTreeProvider implements vscode.TreeDataProvider<Favorite> {

	private _onDidChangeTreeData: vscode.EventEmitter<Favorite | undefined | null | void> = new vscode.EventEmitter<Favorite | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Favorite | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

	constructor(private workspaceRoot: string | undefined) {
		
	}

	getTreeItem(element: Favorite): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Favorite): Thenable<Favorite[]> {
		return new Promise(async resolve => {
			const projects: ProjectItemProps[] = getConfig()
			const items = projects.map(item => {
				return new Favorite(item)
			})
			resolve(items)
		})
	}
}

export class Favorite extends vscode.TreeItem {

	constructor(
		public readonly item: ProjectItemProps
	) {
		const { name, branchName } = item
		super(name);
		this.iconPath = new vscode.ThemeIcon('folder');
		this.tooltip = `${name}`;

		this.description = branchName;
		this.command = {
			title: 'Open Favorite',
			command: 'project-manager.openProject',
			arguments: [item]
		}
	}

	contextValue = "favorited"
}