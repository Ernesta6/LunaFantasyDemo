import { sys } from 'cc';

export class GameDataManager {
    private static readonly SAVE_KEY = "LUNA_STORY_FLAGS";

    // 获取某个状态值，默认返回 0
    static getFlag(key: string): number {
        const data = this.getAllData();
        return data[key] !== undefined ? data[key] : 0;
    }

    // 设置状态值（状态机核心）
    static setFlag(key: string, value: number) {
        const data = this.getAllData();
        data[key] = value;
        this.saveAllData(data);
        console.log(`[存储] 状态更新: ${key} = ${value}`);
    }

    private static getAllData() {
        const saveStr = sys.localStorage.getItem(this.SAVE_KEY);
        return saveStr ? JSON.parse(saveStr) : {};
    }

    private static saveAllData(data: any) {
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    static clearAllData() {
        // 在类内部访问自己的 private 属性是允许的
        sys.localStorage.removeItem(this.SAVE_KEY);
        console.log("本地剧情存储已清空");
    }
}