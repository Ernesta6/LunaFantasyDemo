import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { EventManager, GameEvent } from './EventManager';
import { GameDataManager } from './GameDataManager';
import { PlayerMove } from './LunaController';

const { ccclass, property } = _decorator;

@ccclass('ItemSensor')
export class ItemSensor extends Component {
    @property({ tooltip: "对应任务配置里的物品ID" })
    public itemId: string = "Candle";

    private hasCollected: boolean = false; // 【新增】防抖标记

    start() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            console.log("ItemSensor: 监听触发器事件...");
            collider.on(Contact2DType.BEGIN_CONTACT, this.onTriggerEnter, this);
        } else {
            console.warn("ItemSensor: 未找到Collider2D组件！");
        }
    }

    onTriggerEnter(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        // 【新增】防止重复计数
        if (this.hasCollected) return;

        console.log(`[ItemSensor] 触发器检测: ${other.node.name}`);
        
        if (other.node.name === "Luna") {
            console.log(`[ItemSensor] 检测到Luna节点`);
            
            const isPlayer = other.getComponent(PlayerMove);
            if (isPlayer) {
                console.log(`[ItemSensor] 确认是玩家，拾取物品: ${this.itemId}`);
                
                // 1. 获取当前拾取数量并 +1
                let currentCount = GameDataManager.getFlag(`count_${this.itemId}`) || 0;
                GameDataManager.setFlag(`count_${this.itemId}`, currentCount + 1);
                console.log(`[ItemSensor] 物品计数: ${currentCount + 1}`);
                
                // 2. 广播事件
                EventManager.target.emit(GameEvent.ITEM_COLLECTED, this.itemId);
                console.log(`[ItemSensor] 事件已广播`);
                
                // 【新增】设置已收集标记
                this.hasCollected = true;
                
                // 3. 销毁物品
                this.node.destroy();
                console.log(`[ItemSensor] 物品已销毁`);
            } else {
                console.warn(`[ItemSensor] 检测到Luna但没有PlayerMove组件`);
            }
        }
    }
}