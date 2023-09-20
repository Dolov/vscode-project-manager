// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { debounce, uniqBy } from 'lodash'
import { CurrentProvider, FavoriteProvider } from './TreeDataProvider'
import { ProjectItemProps, copyFolder, increName, getFavoriteProjects, store, getCurrentProjects } from './utils'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	await getCurrentProjects()
	getFavoriteProjects(context)

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

	const openFolder = (project: ProjectItemProps, newWin?: boolean) => {
		const { path } = project
		const folderUri = vscode.Uri.file(path);
		vscode.commands.executeCommand('vscode.openFolder', folderUri, newWin);
	}

	// 在当前窗口打开项目
	const openProjectDisposable = vscode.commands.registerCommand('project-manager.openProject', (project: ProjectItemProps) => {
		openFolder(project)
	});

	// 在新窗口打开项目
	const openNewProjectDisposable = vscode.commands.registerCommand('project-manager.openInNew', ({ item: project }) => {
		openFolder(project, true)
	});

	/** 提供“收藏夹”视图节点数据 */
	const favoriteTreeViewProvider = new FavoriteProvider(rootPath)
	const favoriteTreeView = vscode.window.createTreeView('favorite', {
		treeDataProvider: favoriteTreeViewProvider
	});

	/** 提供“最近使用”视图节点数据 */
	const currentTreeViewProvider = new CurrentProvider(rootPath)
	const currentTreeView = vscode.window.createTreeView('current', {
		treeDataProvider: currentTreeViewProvider
	});
	
	const updateTreeViewTitle = () => {
		currentTreeView.title = `最近使用（${currentTreeViewProvider.count}）`
		favoriteTreeView.title = `收藏夹（${favoriteTreeViewProvider.count}）`
	}

	updateTreeViewTitle()

	const debounceStorage = debounce(async () => {
		context.globalState.update("favorite", store.favorite)
	}, 2000)

	/** 加入“收藏” */
	const favoriteDisposable = vscode.commands.registerCommand('project-manager.favorite', ({ item: project }) => {
		store.favorite.push(project)
		favoriteTreeViewProvider.refresh()
		currentTreeViewProvider.refresh()
		debounceStorage()
		updateTreeViewTitle()
	});

	/** 取消“收藏” */
	const favoritedDisposable = vscode.commands.registerCommand('project-manager.favorited', ({ item: project }) => {
		const index = store.favorite.findIndex(item => item.path === project.path)
		if (index === -1) return
		store.favorite.splice(index, 1)
		favoriteTreeViewProvider.refresh()
		currentTreeViewProvider.refresh()
		debounceStorage()
		updateTreeViewTitle()
	});

	/** 刷新“最近使用” */
	const refreshCurrentDisposable = vscode.commands.registerCommand('project-manager.refreshCurrent', async () => {
		await getCurrentProjects()
		currentTreeViewProvider.refresh()
	});

	/** 刷新“收藏夹” */
	const refreshFavoritedDisposable = vscode.commands.registerCommand('project-manager.refreshFavorite', async () => {
		context.globalState.update("favorite", store.favorite)
		getFavoriteProjects(context)
		favoriteTreeViewProvider.refresh()
	});

	const search = async (options: ProjectItemProps[]) => {
		const quickPick = vscode.window.createQuickPick();
		quickPick.placeholder = '选中以打开';
		quickPick.matchOnDescription = true
		quickPick.items = options.map(item => {
			return {
				...item,
				label: item.name,
				description: item.branchName,
				buttons: [
					{
						iconPath: vscode.Uri.file(path.resolve(__dirname, "../images/open-new-sm.svg")),
						tooltip: "在新窗口打开"
					}
				]
			}
		})

		quickPick.show();
		quickPick.onDidChangeSelection(selection => {
			const item = selection[0] as unknown as ProjectItemProps;
			openFolder(item)
			quickPick.hide()
		});

		quickPick.onDidTriggerItemButton(({ item }) => {
			openFolder(item as unknown as ProjectItemProps, true)
			quickPick.hide()
		})
	}

	/** 搜索 */
	vscode.commands.registerCommand('project-manager.search', () => {
		const allData = uniqBy([...store.favorite, ...store.current], "path")
		search(allData)
	});

	/** 搜索最近 */
	vscode.commands.registerCommand('project-manager.searchCurrent', () => {
		search(store.current)
	});

	/** 搜索收藏夹 */
	vscode.commands.registerCommand('project-manager.searchFavorite', () => {
		search(store.favorite)
	});

	/** 复制出一个新项目 */
	const copyDisposable = vscode.commands.registerCommand('project-manager.copy', async ({ item: project }) => {
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
		setTimeout(async () => {
			await getCurrentProjects()
			currentTreeViewProvider.refresh()
		}, 1000)
	});


	context.subscriptions.push(
		disposable, openProjectDisposable, openNewProjectDisposable,
		copyDisposable, refreshCurrentDisposable, favoriteDisposable, favoritedDisposable,
		refreshFavoritedDisposable
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }
