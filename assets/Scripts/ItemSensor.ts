import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { EventManager, GameEvent } from './EventManager';
import { GameDataManager } from './GameDataManager';
import { PlayerMove } from './LunaController';

const { ccclass, property } = _decorator;

@ccclass('ItemSensor')
export class ItemSensor extends Component {

    @property({ tooltip: "给每个物品一个唯一ID（如 Candle_1, Candle_2）" })
    public sensorId: string = "Item_Unique_ID";

    @property({ tooltip: "对应任务配置里的物品ID" })
    public itemId: string = "Candle";

    private hasCollected: boolean = false; // 【新增】防抖标记

    start() {
        if (GameDataManager.getFlag(`picked_${this.sensorId}`) === 1) {
            this.node.destroy();
            return;
        }

        const collider = this.getComponent(Collider2D);
        if (collider) {
            console.log("ItemSensor: 监听触发器事件...");
            collider.on(Contact2DType.BEGIN_CONTACT, this.onTriggerEnter, this);
        }
    }

    // ItemSensor.ts 修改后的 onTriggerEnter
    onTriggerEnter(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        if (this.hasCollected) return;

        if (other.node.name === "Luna") {
            this.hasCollected = true;
            
            // 1. 增加任务计数
            let currentCount = GameDataManager.getFlag(`count_${this.itemId}`) || 0;
            GameDataManager.setFlag(`count_${this.itemId}`, currentCount + 1);

            // 2. 标记该唯一物品已消失
            GameDataManager.setFlag(`picked_${this.sensorId}`, 1);

            EventManager.target.emit(GameEvent.ITEM_COLLECTED, this.itemId);
            this.node.destroy();
        }
    }
}