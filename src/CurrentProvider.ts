import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectItemProps, getCurrentProjects } from './utils'

export class CurrentTreeViewProvider implements vscode.TreeDataProvider<Project> {

	private _onDidChangeTreeData: vscode.EventEmitter<Project | undefined | null | void> = new vscode.EventEmitter<Project | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Project | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

	constructor(private workspaceRoot: string | undefined) {
		
	}

	getTreeItem(element: Project): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Project): Thenable<Project[]> {
		return new Promise(async resolve => {
			const projects: ProjectItemProps[] = await getCurrentProjects()
			const items = projects.map(item => {
				return new Project(item)
			})
			resolve(items)
		})
	}
}

export class Project extends vscode.TreeItem {

	constructor(
		public readonly item: ProjectItemProps
	) {
		const { name, branchName } = item
		super(name);
		this.iconPath = new vscode.ThemeIcon('folder');
		this.tooltip = `${name}`;

		this.description = branchName;
		this.command = {
			title: 'Open Project',
			command: 'project-manager.openProject',
			arguments: [item]
		}
	}
}