// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TreeDataProvider } from './TreeDataProvider'
import { ProjectItemProps, copyFolder, increName, initConfigFile, updateConfigJson, deleteConfigJson } from './utils'


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	
	initConfigFile()

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

	const favoriteTreeProvider =  new TreeDataProvider(rootPath, "favorite")

	vscode.window.createTreeView('favorite', {
		treeDataProvider: favoriteTreeProvider
	});

	const favoriteDisposable = vscode.commands.registerCommand('project-manager.favorite', ({ item: project }) => {
		updateConfigJson(project)
		favoriteTreeProvider.refresh()
		currentTreeViewProvider.refresh()
	});

	const favoritedDisposable = vscode.commands.registerCommand('project-manager.favorited', ({ item: project }) => {
		deleteConfigJson(project)
		favoriteTreeProvider.refresh()
		currentTreeViewProvider.refresh()
	});

	const currentTreeViewProvider = new TreeDataProvider(rootPath, "current")
	vscode.window.createTreeView('current', {
		treeDataProvider: currentTreeViewProvider
	});

	const refreshCurrentDisposable = vscode.commands.registerCommand('project-manager.refreshCurrent', () => {
		currentTreeViewProvider.refresh()
	});

	const refreshFavoritedDisposable = vscode.commands.registerCommand('project-manager.refreshFavorited', () => {
		favoriteTreeProvider.refresh()
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
	  

	context.subscriptions.push(
		disposable, openProjectDisposable, openNewProjectDisposable,
		copyDisposable, refreshCurrentDisposable, favoriteDisposable, favoritedDisposable,
		refreshFavoritedDisposable,
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
