import { _decorator, Component, AnimationClip, Enum } from 'cc';
const { ccclass, property } = _decorator;

export enum NPCInteractType {
    Dialogue = 0,      // 走剧情对话
    AnimationOnly = 1, // 只播互动动画
}

Enum(NPCInteractType);

@ccclass('NPCEntity')
export class NPCEntity extends Component {
    @property({ tooltip: "NPC的唯一标识，对应状态字典里的Key" })
    public npcID: string = "Nala";

    @property({ type: NPCInteractType, tooltip: "互动类型" })
    public interactType: NPCInteractType = NPCInteractType.Dialogue;

    @property({ tooltip: "剧情对话文件名（Dialogue模式才用）" })
    public dialogueFileName: string = "Nala_Logic";

    @property(AnimationClip)
    public npcAnim: AnimationClip = null!;

    @property({ type: AnimationClip, tooltip: "触发互动时，玩家播放的动画" })
    public playerInteractAnim: AnimationClip = null!;

    @property({ tooltip: "交互后NPC是否循环播放交互动画（保持状态）" })
    public loopAfterInteract: boolean = false;


    // 可选：防抖，防止重复触发
    public isInteracting: boolean = false;
}