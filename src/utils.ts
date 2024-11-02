import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { debounce } from "lodash";

export interface ProjectItemProps {
  name: string;
  path: string;
  branchName?: string;
}

export const getBranchName = (folderPath: string): string => {
  try {
    // 检查是否为 Git 仓库
    if (!fs.existsSync(path.join(folderPath, ".git"))) {
      console.warn(`No Git repository found in folder: ${folderPath}`);
      return "";
    }

    // 获取当前目录下的 Git 分支名称
    const branchName = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: folderPath,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    return branchName || "";
  } catch (error) {
    console.error(`Failed to get branch name for folder: ${folderPath}`, error);
    return "";
  }
};

export class DataSource {
  context: vscode.ExtensionContext;
  public recently: ProjectItemProps[] = [];
  public favorite: ProjectItemProps[] = [];
  private listeners: (() => void)[] = [];
  private debounceUpdateFavorite: (favorite: ProjectItemProps[]) => void;

  constructor(context: vscode.ExtensionContext) {
    this.recently = [];
    this.favorite = [];
    this.context = context;
    this.init();
    this.debounceUpdateFavorite = debounce(async (favorite) => {
      const state = this.context.globalState;
      state.update("favorite", favorite);
      this.init();
    }, 500);
  }

  async init() {
    this.recently = await this.getRecentlyOpened();
    this.favorite = this.getFavorite(this.context);
    for (const listener of this.listeners) {
      listener();
    }
  }

  addEventListener(listener: () => void) {
    this.listeners = [...this.listeners, listener];
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private getFavorite(context: vscode.ExtensionContext) {
    const state = context.globalState;
    const favorite: ProjectItemProps[] = state.get("favorite") || [];
    return favorite
      .filter((item) => !!item)
      .map((item) => {
        return {
          ...item,
          branchName: getBranchName(item.path),
        };
      });
  }

  private async getRecentlyOpened() {
    // 获取最近打开的工作区列表
    const opened = await vscode.commands.executeCommand<{
      workspaces?: Array<{ folderUri?: vscode.Uri }>;
    }>("_workbench.getRecentlyOpened");

    const workspaces = opened?.workspaces ?? [];

    return workspaces
      .filter((workspace) => {
        const folderUriPath = workspace.folderUri?.path || "";
        return fs.existsSync(folderUriPath);
      })
      .map((workspace) => {
        const folderUriPath = workspace.folderUri?.path || "";
        return {
          name: path.basename(folderUriPath),
          path: folderUriPath,
          branchName: getBranchName(folderUriPath),
        };
      });
  }

  addFavorite(project: ProjectItemProps) {
    this.favorite.push(project);
    this.debounceUpdateFavorite(this.favorite);
  }

  removeFavorite(project: ProjectItemProps) {
    const index = this.favorite.findIndex((item) => item.path === project.path);
    if (index !== -1) {
      this.favorite.splice(index, 1);
      this.debounceUpdateFavorite(this.favorite);
    }
  }

  renameFavorite(oldProject: ProjectItemProps, newProject: ProjectItemProps) {
    const index = this.favorite.findIndex(
      (item) => item.path === oldProject.path
    );
    if (index !== -1) {
      this.favorite[index] = newProject;
      this.debounceUpdateFavorite(this.favorite);
    }
  }
}

/** 数字结尾 */
export const endWithNumber = /\d+$/;

/** 递增名称 */
export const increName = (name: string, names: string[]): string => {
  const exist = names.includes(name);
  if (!exist) {
    return name;
  }
  const match = name.match(endWithNumber);
  if (match) {
    const number = parseInt(match[0]);
    // 递增数字
    const incrementedNumber = number + 1;
    // 将递增的数字替换字符串末尾的数字并返回新的字符串
    const newName = name.replace(endWithNumber, `${incrementedNumber}`);
    return increName(newName, names);
  }
  return increName(`${name}2`, names);
};

export function copyFolder(
  sourceDir: string,
  targetDir: string,
  options?: {
    ignores?: string[];
  }
) {
  const { ignores } = options || {};
  // 确保目标文件夹存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
  }

  // 读取源文件夹内容
  fs.readdirSync(sourceDir).forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    if (ignores && ignores.includes(file)) {
      return;
    }

    // 判断是否是文件夹，是的话递归复制，否则直接复制文件
    if (fs.statSync(sourcePath).isDirectory()) {
      copyFolder(sourcePath, targetPath, options);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}
