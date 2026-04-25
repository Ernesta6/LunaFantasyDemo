import { sys } from 'cc';

export class GameDataManager {
    private static readonly SAVE_KEY = "LUNA_STORY_FLAGS";

    static getFlag(key: string, defaultValue: number = 0): number {
        const data = this.getAllData();
        return data[key] !== undefined ? data[key] : defaultValue;
    }

    static setFlag(key: string, value: number) {
        const data = this.getAllData();
        data[key] = value;
        this.saveAllData(data);
    }

    // 新增：专门处理击败的怪物列表
    static addDefeatedMonster(name: string) {
        const data = this.getAllData();
        if (!data["DEFEATED_LIST"]) data["DEFEATED_LIST"] = [];
        if (!data["DEFEATED_LIST"].includes(name)) {
            data["DEFEATED_LIST"].push(name);
        }
        this.saveAllData(data);
    }

    static getDefeatedMonsters(): string[] {
        return this.getAllData()["DEFEATED_LIST"] || [];
    }

    static clearAllData() {
        sys.localStorage.removeItem(this.SAVE_KEY);
        console.log("[测试模式] 游戏进度已重置。");
    }

    private static getAllData() {
        const saveStr = sys.localStorage.getItem(this.SAVE_KEY);
        return saveStr ? JSON.parse(saveStr) : {};
    }

    private static saveAllData(data: any) {
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }
}