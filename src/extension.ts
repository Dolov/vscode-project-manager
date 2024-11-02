// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { uniqBy } from "lodash";
import { CurrentProvider, FavoriteProvider } from "./TreeDataProvider";
import { ProjectItemProps, copyFolder, increName, DataSource } from "./utils";

const openFolder = (project: ProjectItemProps, newWin?: boolean) => {
  const { path } = project;
  const folderUri = vscode.Uri.file(path);
  vscode.commands.executeCommand("vscode.openFolder", folderUri, newWin);
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "project-manager" is now active!!!!!!!!!!!!!!!!!!!!!!!!!!'
  );

  const dataSource = new DataSource(context);

  /** 提供“收藏夹”视图节点数据 */
  const favoriteTreeViewProvider = new FavoriteProvider(dataSource);
  /** 提供“最近使用”视图节点数据 */
  const currentTreeViewProvider = new CurrentProvider(dataSource);

  const favoriteTreeView = vscode.window.createTreeView("favorite", {
    treeDataProvider: favoriteTreeViewProvider,
  });

  const currentTreeView = vscode.window.createTreeView("recently", {
    treeDataProvider: currentTreeViewProvider,
  });

  currentTreeViewProvider.attachTreeView(currentTreeView, "最近使用");
  favoriteTreeViewProvider.attachTreeView(favoriteTreeView, "收藏夹");

  dataSource.addEventListener(() => {
    currentTreeViewProvider.refresh();
    favoriteTreeViewProvider.refresh();
  });

  // 在当前窗口打开项目
  const openProjectDisposable = vscode.commands.registerCommand(
    "project-manager.openProject",
    (project: ProjectItemProps) => {
      openFolder(project);
    }
  );

  // 在新窗口打开项目
  const openNewProjectDisposable = vscode.commands.registerCommand(
    "project-manager.openInNew",
    ({ item: project }) => {
      openFolder(project, true);
    }
  );

  /** 加入“收藏” */
  const favoriteDisposable = vscode.commands.registerCommand(
    "project-manager.favorite",
    ({ item }) => {
      dataSource.addFavorite(item);
    }
  );

  /** 取消“收藏” */
  const favoritedDisposable = vscode.commands.registerCommand(
    "project-manager.favorited",
    ({ item }) => {
      dataSource.removeFavorite(item);
    }
  );

  /** 刷新“最近使用” */
  const refreshCurrentDisposable = vscode.commands.registerCommand(
    "project-manager.refreshCurrent",
    () => {
      dataSource.init();
    }
  );

  /** 刷新“收藏夹” */
  const refreshFavoritedDisposable = vscode.commands.registerCommand(
    "project-manager.refreshFavorite",
    () => {
      dataSource.init();
    }
  );

  const search = async (options: ProjectItemProps[]) => {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = "选中以打开";
    quickPick.matchOnDescription = true;
    quickPick.items = options.map((item) => {
      return {
        ...item,
        label: item.name,
        description: item.branchName,
        buttons: [
          {
            iconPath: vscode.Uri.file(
              path.resolve(__dirname, "../images/open-new-sm.svg")
            ),
            tooltip: "在新窗口打开",
          },
        ],
      };
    });

    quickPick.show();
    quickPick.onDidChangeSelection((selection) => {
      const item = selection[0] as unknown as ProjectItemProps;
      openFolder(item);
      quickPick.hide();
    });

    quickPick.onDidTriggerItemButton(({ item }) => {
      openFolder(item as unknown as ProjectItemProps, true);
      quickPick.hide();
    });
  };

  /** 搜索 */
  vscode.commands.registerCommand("project-manager.search", () => {
    const allData = uniqBy(
      [...dataSource.favorite, ...dataSource.recently],
      "path"
    );
    search(allData);
  });

  /** 搜索最近 */
  vscode.commands.registerCommand("project-manager.searchCurrent", () => {
    search(dataSource.recently);
  });

  /** 搜索收藏夹 */
  vscode.commands.registerCommand("project-manager.searchFavorite", () => {
    search(dataSource.favorite);
  });

  /** 复制出一个新项目 */
  const copyDisposable = vscode.commands.registerCommand(
    "project-manager.copy",
    async ({ item: project }) => {
      const { path: dirPath, name } = project;
      const parentPath = path.dirname(dirPath);
      const fileNames = fs.readdirSync(parentPath);
      const newName = increName(name, fileNames);
      const userInputName = await vscode.window.showInputBox({
        placeHolder: "请输入项目名称",
        prompt: "请输入项目名称",
        value: newName,
      });
      const newPath = `${parentPath}/${userInputName}`;
      copyFolder(dirPath, newPath, {
        ignores: ["node_modules", ".umi", ".yalc"],
      });
      const folderUri = vscode.Uri.file(newPath);
      vscode.commands.executeCommand("vscode.openFolder", folderUri, true);
      setTimeout(() => {
        currentTreeViewProvider.refresh();
      }, 1000);
    }
  );

  /** 项目重命名 */
  const renameDisposable = vscode.commands.registerCommand(
    "project-manager.rename",
    async ({ item: project }) => {
      const { path: dirPath, name } = project;

      const parentPath = path.dirname(dirPath);
      const newInputName = await vscode.window.showInputBox({
        placeHolder: "请输入项目名称",
        prompt: "请输入项目名称",
        value: name,
      });
      if (!newInputName) return;
      const newPath = `${parentPath}/${newInputName}`;
      fs.renameSync(dirPath, newPath);

      dataSource.renameFavorite(project, {
        ...project,
        name: newInputName,
        path: newPath,
      });
    }
  );

  context.subscriptions.push(
    openProjectDisposable,
    openNewProjectDisposable,
    copyDisposable,
    favoriteDisposable,
    favoritedDisposable,
    renameDisposable,
    refreshCurrentDisposable,
    refreshFavoritedDisposable
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
