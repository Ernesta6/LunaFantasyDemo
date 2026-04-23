import { _decorator, Component, Node, Label, Sprite, resources, SpriteFrame, error, input, Input, EventTouch, JsonAsset, System, sys } from 'cc';
import { PlayerMove } from './LunaController';
import { GameDataManager } from './GameDataManager';
import { EventManager, GameEvent } from './EventManager';
const { ccclass, property } = _decorator;

interface DialogueStep {
    role: string;
    content: string;
    avatar: string;
}

interface DialogueBlock {
    id: string;
    condition: string;    // 例如 "nala_state == 0"
    content: DialogueStep[];
    afterAction: string;  // 例如 "set_flag:nala_state:1"
}

@ccclass('DialogueManager')
export class DialogueManager extends Component {
    @property(PlayerMove)
    PlayerMove: PlayerMove = null!;

    @property({ group: "Debug", tooltip: "勾选后，每次启动游戏都会清空所有剧情进度" })
    public resetProgressOnStart: boolean = false;

    @property(Label) nameLabel: Label = null!;
    @property(Label) contentLabel: Label = null!; // 建议先用Label，RichText打字机需要特殊处理
    @property(Sprite) avatarSprite: Sprite = null!;
    @property(Node) dialoguePanel: Node = null!; // 对话框根节点

    @property({ tooltip: "游戏开始时自动播放的对话文件名（不带后缀），留空则不播放" })
    public initialDialogueFile: string = "StartDialogue"; // 默认填上你的文件名

    private currentDialogueSteps: DialogueStep[] = [];
    private currentIndex: number = 0;
    private isTyping: boolean = false;
    private currentFullText: string = "";
    private currentAfterAction: string = ""; // 存储对话完要执行的操作

    start() {
        input.off(Input.EventType.TOUCH_START, this.onScreenClick, this);
        input.on(Input.EventType.TOUCH_START, this.onScreenClick, this);
        this.dialoguePanel.active = false;

        if (this.resetProgressOnStart) {
            // 直接调用类方法，不要去访问 .SAVE_KEY
            GameDataManager.clearAllData();
        }

        if (this.initialDialogueFile && this.initialDialogueFile !== "") {
            this.scheduleOnce(() => {
                // 💡 检查开场状态位，比如 "game_start_intro"
                // 如果值为 0（代表还没播过），则播放
                if (GameDataManager.getFlag("game_start_intro") === 0) {
                    this.loadDialogueData(this.initialDialogueFile);
                }
            }, 0.5); // 稍微延迟一点确保系统稳定
        }
    }

    onDestroy() {
        // 养成好习惯：销毁时取消监听
        input.off(Input.EventType.TOUCH_START, this.onScreenClick, this);
    }

    /**
     * 从 resources 加载 JSON 配置文件
     */
    /**
     * 修改后的加载函数：根据传入的文件名加载
     * @param fileName JSON文件名
     */
    public loadDialogueData(fileName: string) {
        if (this.dialoguePanel.active) return;



        resources.load(`Dialog/${fileName}`, JsonAsset, (err, asset) => {
            if (err) return error("加载失败", err);

            const blocks = asset.json as DialogueBlock[];
            // --- 核心：条件匹配引擎 ---
            const matchedBlock = blocks.find(block => this.checkCondition(block.condition));

            if (matchedBlock) {
                this.currentDialogueSteps = matchedBlock.content;
                this.currentAfterAction = matchedBlock.afterAction;
                this.currentIndex = 0;
                this.startDialogueUI();
            }
        });
    }

    private checkCondition(conditionStr: string): boolean {
        if (!conditionStr || conditionStr === "") return true;

        const parts = conditionStr.split(" "); // ["nala_state", "==", "0"]
        const key = parts[0];
        const op = parts[1];
        const val = parseInt(parts[2]);

        const currentVal = GameDataManager.getFlag(key);
        if (op === "==") return currentVal === val;
        if (op === ">") return currentVal > val;
        return false;
    }

    private startDialogueUI() {
        this.dialoguePanel.active = true;
        if (this.PlayerMove) {
            this.PlayerMove.canMove = false;
            this.PlayerMove.stopMovement();
        }
        this.displayStep();
    }

    displayStep() {
        if (this.currentIndex >= this.currentDialogueSteps.length) {
            this.onDialogueComplete();
            return;
        }
        const data = this.currentDialogueSteps[this.currentIndex];
        this.nameLabel.string = data.role;
        this.loadAvatar(data.avatar);
        this.playTypewriter(data.content);
    }


    /**
     * 核心逻辑：响应点击动作
     */
    onScreenClick(event: EventTouch) {
        // 如果对话框没显示，不触发
        if (!this.dialoguePanel.active) return;

        if (this.isTyping) {
            // 情况A：正在打字 -> 立即显示完整文本（跳过动画）
            this.skipTyping();
        } else {
            // 情况B：文本已显示完 -> 进入下一句
            this.nextStep();
        }
    }


    /**
     * 动态加载头像
     * @param fileName 图片名（不带后缀）
     */
    loadAvatar(fileName: string) {
        if (!fileName) return;

        // 注意：这里是 Avatar (根据你修改后的文件夹名)，且没有后缀 s
        const path = `Avatar/${fileName}/spriteFrame`;

        console.log("正在尝试加载路径:", path); // 打印出来辅助检查

        resources.load(path, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                // 如果报错，这里会打印具体的错误原因
                console.warn(`${fileName} 头像加载失败，错误详情:`, err);
                return;
            }
            this.avatarSprite.spriteFrame = spriteFrame;
            console.log("头像加载成功！");
        });
    }

    /**
     * 打字机效果逻辑
     */
    playTypewriter(text: string) {
        this.isTyping = true;
        this.currentFullText = text;
        this.contentLabel.string = ""; // 先清空

        let charIndex = 0;
        this.unscheduleAllCallbacks(); // 清除之前的计时器，防止叠加

        this.schedule(() => {
            charIndex++;
            this.contentLabel.string = text.substring(0, charIndex);

            // 检查完成
            if (charIndex >= text.length) {
                this.isTyping = false;
                this.unscheduleAllCallbacks();
            }
        }, 0.05); // 控制打字速度 (0.05s/字)
    }

    /**
     * 立即停止打字，显示全部文本
     */
    skipTyping() {
        this.unscheduleAllCallbacks();
        this.contentLabel.string = this.currentFullText;
        this.isTyping = false;
    }

    /**
     * 跳转下一句
     */
    nextStep() {
        this.currentIndex++;
        this.displayStep();
    }

    /**
     * 所有对话结束
     */
    onDialogueComplete() {
        console.log("对话结束！");
        this.dialoguePanel.active = false;
        if (this.PlayerMove) this.PlayerMove.canMove = true;

        // --- 核心：执行后续动作 ---
        if (this.currentAfterAction) {
            this.executeAction(this.currentAfterAction);
        }
    }

    // 在 DialogueManager.ts 的 executeAction 中增加完成检测

    private executeAction(actionStr: string) {
        const parts = actionStr.split(":");
        const command = parts[0];

        if (command === "set_flag") {
            GameDataManager.setFlag(parts[1], parseInt(parts[2]));
        }
        else if (command === "accept_quest") {
            const questId = parts[1];
            GameDataManager.setFlag(`quest_${questId}_state`, 1); // 1 = 进行中
            GameDataManager.setFlag("nala_talk_count", 3);
            console.log(`任务 ${questId} 已接取，对话计数已更新`);
            EventManager.target.emit(GameEvent.QUEST_ACCEPTED, questId);
        }
        // 【核心】：检查任务是否可以交付
        else if (command === "check_quest_finish") {
            const questId = parts[1];        // 例如 "candle_quest"
            const targetId = parts[2];       // 例如 "Candle"
            const countNeeded = parseInt(parts[3]); // 例如 5

            const currentItems = GameDataManager.getFlag(`count_${targetId}`);
            console.log(`检查任务条件: ${questId}, 需要 ${countNeeded} 个 ${targetId}, 当前有 ${currentItems} 个`);

            if (currentItems >= countNeeded) {
                // ✅ 满足条件，标记任务为已完成
                GameDataManager.setFlag(`quest_${questId}_state`, 2); // 2 = 已达成
                GameDataManager.setFlag(`count_${targetId}`, currentItems - countNeeded); // 扣除已交付的物品
                console.log("✅ 任务已完成！物品已交付");
                EventManager.target.emit(GameEvent.QUEST_COMPLETE, questId); // 【新增事件】
            } else {
                console.log("物品不足，无法交付");
            }
        }
    }
}