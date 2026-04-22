import { _decorator, Component, log } from 'cc';
import { EventManager, GameEvent } from './EventManager';

// 任务状态枚举
export enum QuestStatus {
    NOT_STARTED, // 未开始
    IN_PROGRESS, // 进行中
    FINISHED,    // 已完成
}

// 任务数据接口
export interface IQuest {
    id: string;
    title: string;
    status: QuestStatus;
}

export class QuestManager {
    // 存储所有任务的字典，Key是任务ID
    private static questList: Map<string, IQuest> = new Map();

    /**
     * 初始化任务数据（实际开发中这里应该从 JSON 配置文件读取）
     */
    public static init() {
        this.questList.set("QUEST_001", { id: "QUEST_001", title: "Luna的初次冒险", status: QuestStatus.NOT_STARTED });
        this.questList.set("QUEST_002", { id: "QUEST_002", title: "收集神秘水晶", status: QuestStatus.NOT_STARTED });
        log("QuestManager: 任务系统初始化完成");
    }

    /**
     * 接取任务
     */
    public static acceptQuest(questId: string) {
        const quest = this.questList.get(questId);
        if (quest && quest.status === QuestStatus.NOT_STARTED) {
            quest.status = QuestStatus.IN_PROGRESS;
            log(`任务已接取: ${quest.title}`);
            
            // 发送全局事件，通知 UI 界面显示任务追踪
            EventManager.target.emit(GameEvent.QUEST_ACCEPTED, questId);
        }
    }

    /**
     * 完成任务
     */
    public static completeQuest(questId: string) {
        const quest = this.questList.get(questId);
        if (quest && quest.status === QuestStatus.IN_PROGRESS) {
            quest.status = QuestStatus.FINISHED;
            log(`任务已完成: ${quest.title}`);
            
            // 可以在这里发放奖励
            // GameDataManager.addMoney(100);
        }
    }

    /**
     * 查询任务状态
     */
    public static getQuestStatus(questId: string): QuestStatus {
        const quest = this.questList.get(questId);
        return quest ? quest.status : QuestStatus.NOT_STARTED;
    }
}