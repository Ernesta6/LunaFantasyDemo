import { Vec3 } from 'cc';

export class BattleResultManager {
    public static lastMapPosition: Vec3 = new Vec3(0, 0, 0);
    public static targetMonsterName: string = "";
    public static isMonsterDefeated: boolean = false;
    public static isReturningFromBattle: boolean = false;

    // 新增：用于在场景间传递战斗后的状态
    public static currentHP: number = -1; 
    public static currentMP: number = -1;
}