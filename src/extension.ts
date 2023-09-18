// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DepNodeProvider } from './nodeDependencies'
import { CurrentTreeViewProvider } from './CurrentProvider'
import { ProjectItemProps, copyFolder, increName } from './utils'


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
	? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "project-manager" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('project-manager.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from project-manager!');
	});

	const openProjectDisposable = vscode.commands.registerCommand('project-manager.openProject', (project: ProjectItemProps) => {
		const { path } = project
		const folderUri = vscode.Uri.file(path);
		vscode.commands.executeCommand('vscode.openFolder', folderUri);
	});

	const openNewProjectDisposable = vscode.commands.registerCommand('project-manager.openInNew', ({ item: project }) => {
		const { path } = project
		const folderUri = vscode.Uri.file(path);
		vscode.commands.executeCommand('vscode.openFolder', folderUri, true);
	});

	vscode.window.createTreeView('favorites', {
		treeDataProvider: new DepNodeProvider(rootPath)
	});

	const currentTreeViewProvider = new CurrentTreeViewProvider(rootPath)
	vscode.window.createTreeView('current', {
		treeDataProvider: currentTreeViewProvider
	});

	const refreshCurrentDisposable = vscode.commands.registerCommand('project-manager.refreshCurrent', () => {
		currentTreeViewProvider.refresh()
	});

	const copyDisposable = vscode.commands.registerCommand('project-manager.copy', ({ item: project }) => {
		const { path: dirPath, name } = project
		const parentPath = path.dirname(dirPath)
		const fileNames = fs.readdirSync(parentPath)
		const newName = increName(name, fileNames)
		const newPath = `${parentPath}/${newName}`
		copyFolder(dirPath, newPath, {
			ignores: ["node_modules", ".umi", ".yalc"]
		})
		const folderUri = vscode.Uri.file(newPath);
		vscode.commands.executeCommand('vscode.openFolder', folderUri, true);
		currentTreeViewProvider.refresh()
	});
	  

	context.subscriptions.push(disposable, openProjectDisposable, openNewProjectDisposable, copyDisposable, refreshCurrentDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
