import { EventTarget } from 'cc';

// 定义全局事件名称常量，防止手打字母错误
export const GameEvent = {
    ITEM_COLLECTED: "ITEM_COLLECTED", // 拾取物品
    QUEST_ACCEPTED: "QUEST_ACCEPTED", // 接取任务
    QUEST_COMPLETE: "QUEST_COMPLETE", // 完成任务
};

export class EventManager {
    public static readonly target = new EventTarget();
}


