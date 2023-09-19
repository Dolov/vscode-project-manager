import * as vscode from 'vscode';
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'


const getBranchName = (folderPath: string) => {
  try {
    // 执行 git 命令获取分支名称
    const branchName = execSync('git rev-parse --abbrev-ref HEAD', { cwd: folderPath }).toString().trim();
    return branchName
  } catch (error) {
    return ""
  }
}

export interface ProjectItemProps {
  name: string
  path: string
  branchName?: string
}

export const getCurrentProjects = async () => {
  const opened = await vscode.commands.executeCommand("_workbench.getRecentlyOpened");
  // @ts-ignore
  const workspaces = opened.workspaces || []

  const projects = workspaces.map((workspace: any) => {
    const originPath: string = workspace?.folderUri?.path || "";
    const originPathArr = originPath.split("/");
    const name = originPathArr.pop();
    const path = workspace?.folderUri?.path || ""
    return {
      name,
      path,
      branchName: getBranchName(path),
    };
  });

  return projects;
};

/** 数字结尾 */
export const endWithNumber = /\d+$/

/** 递增名称 */
export const increName = (name: string, names: string[]): string => {
  const exist = names.includes(name)
  if (!exist) return name
  const match = name.match(endWithNumber);
  if (match) {
    const number = parseInt(match[0]);
    // 递增数字
    const incrementedNumber = number + 1;
    // 将递增的数字替换字符串末尾的数字并返回新的字符串
    const newName = name.replace(endWithNumber, `${incrementedNumber}`);
    return increName(newName, names)
  }
  return increName(`${name}2`, names)
}


export function copyFolder(sourceDir: string, targetDir: string, options?: {
  ignores?: string[]
}) {
  const { ignores } = options || {}
  // 确保目标文件夹存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
  }

  // 读取源文件夹内容
  fs.readdirSync(sourceDir).forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    if (ignores && ignores.includes(file)) {
      return
    }

    // 判断是否是文件夹，是的话递归复制，否则直接复制文件
    if (fs.statSync(sourcePath).isDirectory()) {
      copyFolder(sourcePath, targetPath, options);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}


export const configPath = path.join(__dirname, 'config.json')

export const initConfigFile = () => {
  if (fs.existsSync(configPath)) {
    return
  }
  fs.writeFileSync(configPath, JSON.stringify([], null, 2))
}

export const getConfig = () => {
  const config = fs.readFileSync(configPath, { "encoding": "utf-8" })
  return JSON.parse(config)
}

export const updateConfigJson = (project: ProjectItemProps) => {
  const config: ProjectItemProps[] = getConfig()
  const index = config.findIndex((item: ProjectItemProps) => project.path === item.path)
  if (index > -1) {
    config.splice(index, 1, project)
  } else {
    config.push(project)
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export const deleteConfigJson = (project: ProjectItemProps) => {
  const config: ProjectItemProps[] = getConfig()
  const index = config.findIndex((item: ProjectItemProps) => project.path === item.path)
  if (index === -1) return
  config.splice(index, 1)
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}