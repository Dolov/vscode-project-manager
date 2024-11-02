import * as vscode from "vscode";
import { ProjectItemProps, getBranchName, DataSource } from "./utils";

abstract class BaseProvider implements vscode.TreeDataProvider<Project> {
  protected _onDidChangeTreeData = new vscode.EventEmitter<
    Project | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(public dataSource: DataSource) {}

  abstract get count(): number;
  abstract getItems(): ProjectItemProps[];

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Project): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Project): Promise<Project[]> {
    const favoriteList = this.dataSource.favorite;
    const items = this.getItems().map((item) => {
      const branchName = item.branchName || getBranchName(item.path);
      return new Project({ ...item, branchName }, favoriteList);
    });
    return items;
  }
}

export class CurrentProvider extends BaseProvider {
  get count() {
    return this.dataSource.recently.length;
  }

  getItems() {
    return this.dataSource.recently;
  }
}

export class FavoriteProvider extends BaseProvider {
  get count() {
    return this.dataSource.favorite.length;
  }

  getItems() {
    return this.dataSource.favorite;
  }
}

export class Project extends vscode.TreeItem {
  contextValue = "favorite";

  constructor(
    public readonly item: ProjectItemProps,
    favoriteList: ProjectItemProps[]
  ) {
    const { path, name, branchName } = item;
    super(name);
    this.iconPath = new vscode.ThemeIcon("folder");
    this.tooltip = branchName ? `${name} (${branchName})` : name;
    this.description = branchName || "";
    this.command = {
      title: "Open Project",
      command: "project-manager.openProject",
      arguments: [item],
    };

    if (favoriteList.some((favorite) => favorite.path === path)) {
      this.contextValue = "favorited";
    }
  }
}
