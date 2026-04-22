import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { EventManager, GameEvent } from './EventManager';
import { GameDataManager } from './GameDataManager';
import { PlayerMove } from './LunaController'; // 导入角色脚本

const { ccclass, property } = _decorator;

@ccclass('ItemSensor')
export class ItemSensor extends Component {
    @property({ tooltip: "对应任务配置里的物品ID" })
    public itemId: string = "Candle";

    start() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            console.log("ItemSensor: 监听触发器事件...");
            // 2D 物理中，触发器和碰撞共用 BEGIN_CONTACT 事件
            collider.on(Contact2DType.BEGIN_CONTACT, this.onTriggerEnter, this);
        }
    }

    /**
     * 当触发器开始接触时回调
     * @param self 自身的碰撞体
     * @param other 对方的碰撞体
     * @param contact 物理接触信息
     */
    onTriggerEnter(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        // 触发器模式下，通常只需要判断对方节点的名称或分组
        if (other.node.name === "Luna") {
            const isPlayer = other.getComponent(PlayerMove);  
            if (isPlayer) { 
            console.log(`[Trigger] 检测到 Luna, 拾取物品: ${this.itemId}`);
            // ... 剩余逻辑保持不变
        }   
            
            // 1. 获取当前拾取数量并 +1
            let currentCount = GameDataManager.getFlag(`count_${this.itemId}`) || 0;
            GameDataManager.setFlag(`count_${this.itemId}`, currentCount + 1);
            
            // 2. 广播事件
            EventManager.target.emit(GameEvent.ITEM_COLLECTED, this.itemId);
            
            // 3. 销毁物品
            this.node.destroy();
        }
    }
}