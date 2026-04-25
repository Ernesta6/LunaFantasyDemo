import { _decorator, Component, Node, Animation, director, Button, Prefab, instantiate, Vec3 } from 'cc';
import { LunaUI } from './UI/LunaUI';
import { BattleResultManager } from './BattleResultManager';
import { GameDataManager } from './GameDataManager';

const { ccclass, property } = _decorator;

@ccclass('BattleManager')
export class BattleManager extends Component {

    @property(LunaUI) lunaUI: LunaUI = null!;
    @property(Animation) lunaAnim: Animation = null!;
    @property(Animation) monsterAnim: Animation = null!;
    @property(Node) optionsUI: Node = null!;

    // 特效预制体
    @property(Prefab) healEffectPrefab: Prefab = null!;
    @property(Prefab) skillEffectPrefab: Prefab = null!; // 新增：技能特效设置在 Monster 身上

    // 动画名称映射
    private readonly LUNA_IDLE = "Luna_Fighting";
    private readonly LUNA_HURT = "Luna_Hurt";
    private readonly LUNA_DEF = "Luna_Def";
    private readonly MONSTER_IDLE = "Monster_Fighting";
    private readonly MONSTER_ATK = "Monster_Atk";

    // 坐标配置
    private readonly LUNA_DEFAULT_POS = new Vec3(406.909, 26.525, 0);

    private stats = {
        luna: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, atk: 30, defMultiplier: 1 },
        monster: { hp: 80, atk: 10 }
    };

    private isProcessing: boolean = false;
    private isDefending: boolean = false;

    start() {
        const savedHP = GameDataManager.getFlag("LUNA_HP", 100);
        const savedMP = GameDataManager.getFlag("LUNA_MP", 50);
        this.stats.luna.hp = savedHP;
        this.stats.luna.mp = savedMP;

        this.updateAllUI();
        this.bindButtons();

        this.scheduleOnce(() => {
            this.resetLunaPosition(); // 初始位置校准
            this.playIdleAll();
        }, 0);
    }

    /**
     * 重置 Luna 到标准位置
     */
    private resetLunaPosition() {
        this.lunaAnim.node.setPosition(this.LUNA_DEFAULT_POS);
    }

    private playIdleAll() {
        if (!this.isDefending) {
            this.resetLunaPosition(); // 确保回待机前坐标正确
            if (this.lunaAnim.getState(this.LUNA_IDLE)) this.lunaAnim.play(this.LUNA_IDLE);
        }
        if (this.monsterAnim.getState(this.MONSTER_IDLE)) this.monsterAnim.play(this.MONSTER_IDLE);
    }

    private bindButtons() {
        const actions = ["Atk", "DF", "Skill", "Heal", "Escape"];
        actions.forEach(act => {
            const btnNode = this.optionsUI.getChildByName(`Grid_${act}`);
            if (btnNode) {
                btnNode.on(Button.EventType.CLICK, () => { this.onPlayerAction(act); }, this);
            }
        });
    }

    // --- 玩家行为逻辑 ---
    private async onPlayerAction(actionType: string) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.setUIInteractable(false);

        // 如果之前在防御，现在要执行新动作，重置状态和坐标
        if (this.isDefending) {
            this.isDefending = false;
            this.resetLunaPosition();
        }

        this.stats.luna.defMultiplier = 1;

        switch (actionType) {
            case "Atk":
                await this.executeActionWithAnim(this.lunaAnim, "Luna_Atk", "monster", this.stats.luna.atk);
                break;
            case "DF":
                await this.executeActionWithAnim(this.lunaAnim, this.LUNA_DEF, "none", 0);
                this.stats.luna.defMultiplier = 0.5;
                this.isDefending = true;
                break;
            case "Skill":
                if (this.stats.luna.mp >= 20) {
                    this.stats.luna.mp -= 20;
                    // --- 修改：在 Monster 身上生成特效 ---
                    this.spawnEffect(this.skillEffectPrefab, this.monsterAnim.node.worldPosition);
                    await this.executeActionWithAnim(this.lunaAnim, "Luna_Skill", "monster", this.stats.luna.atk * 1.5);
                } else {
                    this.isProcessing = false;
                    this.setUIInteractable(true);
                    return;
                }
                break;
            case "Heal":
                this.spawnEffect(this.healEffectPrefab, this.lunaAnim.node.worldPosition);
                await this.executeActionWithAnim(this.lunaAnim, "Luna_Heal", "none", 0);
                this.stats.luna.hp = Math.min(this.stats.luna.maxHp, this.stats.luna.hp + 30);
                break;
            case "Escape":
                await this.executeActionWithAnim(this.lunaAnim, "Luna_Escape", "none", 0);
                this.exitBattle(false);
                return;
        }

        if (!this.isDefending) {
            this.resetLunaPosition(); // 动作做完归位
            this.lunaAnim.play(this.LUNA_IDLE);
        }

        this.updateAllUI();
        if (this.checkGameOver()) return;

        await this.wait(500);
        await this.monsterAction();
    }

    private exitBattle(isWin: boolean) {
        // 1. 存储当前状态到本地（永久存储）
        GameDataManager.setFlag("LUNA_HP", this.stats.luna.hp);
        GameDataManager.setFlag("LUNA_MP", this.stats.luna.mp);

        // 2. 标记状态，返回地图
        BattleResultManager.isReturningFromBattle = true;
        if (isWin) {
            BattleResultManager.isMonsterDefeated = true;
            // 同时记录到永久死亡名单
            GameDataManager.addDefeatedMonster(BattleResultManager.targetMonsterName);
        } else {
            BattleResultManager.isMonsterDefeated = false;
        }

        director.loadScene("Main_Scene");
    }

    // --- 怪物行为逻辑 ---
    private async monsterAction() {
        const state = this.monsterAnim.getState(this.MONSTER_ATK);
        if (!state) return;

        this.monsterAnim.play(this.MONSTER_ATK);
        await this.wait(state.duration * 0.4 * 1000);

        // --- 修改：解除防御并校准坐标后再播放受击 ---
        if (this.isDefending) {
            this.isDefending = false;
            this.resetLunaPosition();
        }

        this.lunaAnim.play(this.LUNA_HURT);
        this.stats.luna.hp -= this.stats.monster.atk * this.stats.luna.defMultiplier;
        this.updateAllUI();

        await this.wait(800);
        this.playIdleAll();

        if (this.checkGameOver()) return;

        this.isProcessing = false;
        this.setUIInteractable(true);
    }

    private spawnEffect(prefab: Prefab, worldPos: Vec3) {
        if (!prefab) return;
        const fx = instantiate(prefab);
        this.node.addChild(fx);
        fx.setWorldPosition(worldPos);

        this.scheduleOnce(() => {
            if (fx.isValid) fx.destroy();
        }, 2.0);
    }

    private async executeActionWithAnim(anim: Animation, clipName: string, target: "luna" | "monster" | "none", dmg: number) {
        const state = anim.getState(clipName);
        if (!state) {
            anim.play(clipName);
            await this.wait(1000);
            return;
        }
        anim.play(clipName);
        await this.wait(state.duration * 0.5 * 1000);
        if (target === "monster") this.stats.monster.hp -= dmg;
        this.updateAllUI();
        await this.wait(state.duration * 0.5 * 1000);
    }

    private checkGameOver(): boolean {
        if (this.stats.monster.hp <= 0) {
            this.exitBattle(true);
            return true;
        }
        if (this.stats.luna.hp <= 0) {
            // 死亡重置 HP（或者跳到游戏结束界面）
            GameDataManager.setFlag("LUNA_HP", 100);
            director.loadScene("GameOver_Scene");
            return true;
        }
        return false;
    }

    private updateAllUI() {
        this.lunaUI.updateHP(this.stats.luna.hp, this.stats.luna.maxHp);
        this.lunaUI.updateMP(this.stats.luna.mp, this.stats.luna.maxMp);
    }

    private setUIInteractable(active: boolean) {
        this.optionsUI.active = active;
    }

    private wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}