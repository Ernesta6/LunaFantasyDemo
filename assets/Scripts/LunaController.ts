import {
    _decorator, Component, Vec3, input, Input, KeyCode, EventKeyboard, Animation,
    AnimationClip, Collider2D, Node, Contact2DType, IPhysics2DContact
} from 'cc';
import { NPCEntity, NPCInteractType } from "./NPCEntity";
import { DialogueManager } from "./DialogueManager";
const { ccclass, property } = _decorator;

enum PlayerDir {
    UP,
    DOWN,
    LEFT,
    RIGHT,
    UP_LEFT,
    UP_RIGHT,
    DOWN_LEFT,
    DOWN_RIGHT
}

@ccclass('PlayerMove')
export class PlayerMove extends Component {
    public canMove: boolean = true;
    private isInteracting: boolean = false;

    @property({ tooltip: "Walk Speed" })
    public walkSpeed: number = 5;

    @property({ tooltip: "Run Speed" })
    public runSpeed: number = 12;

    @property({ tooltip: "Jump Duration" })
    public jumpDuration: number = 0.4;

    @property({ tooltip: "跳跃时图片向上偏移的像素" })
    public jumpOffset: number = 15;

    @property(Animation)
    private playerAnim: Animation = null!;


    @property(DialogueManager)
    public dialogueManager: DialogueManager = null!; // 在编辑器里把对话管理器拖进来
    private currentNPC: NPCEntity | null = null;

    @property({ group: "Climbing", type: AnimationClip }) private climbUp: AnimationClip = null!;
    @property({ group: "Climbing", type: AnimationClip }) private climbDown: AnimationClip = null!;
    @property({ group: "Climbing", type: AnimationClip }) private climbLeft: AnimationClip = null!;
    @property({ group: "Climbing", type: AnimationClip }) private climbRight: AnimationClip = null!;

    @property({ group: "Climbing" }) public climbSpeed: number = 3; // 爬行速度通常慢一点
    private isClimbing: boolean = false; // 是否在藤蔓范围内

    @property(AnimationClip) private walkUp: AnimationClip = null!;
    @property(AnimationClip) private walkDown: AnimationClip = null!;
    @property(AnimationClip) private walkLeft: AnimationClip = null!;
    @property(AnimationClip) private walkRight: AnimationClip = null!;
    @property(AnimationClip) private walkUpLeft: AnimationClip = null!;
    @property(AnimationClip) private walkUpRight: AnimationClip = null!;
    @property(AnimationClip) private walkDownLeft: AnimationClip = null!;
    @property(AnimationClip) private walkDownRight: AnimationClip = null!;

    @property(AnimationClip) private runUp: AnimationClip = null!;
    @property(AnimationClip) private runDown: AnimationClip = null!;
    @property(AnimationClip) private runLeft: AnimationClip = null!;
    @property(AnimationClip) private runRight: AnimationClip = null!;
    @property(AnimationClip) private runUpLeft: AnimationClip = null!;
    @property(AnimationClip) private runUpRight: AnimationClip = null!;
    @property(AnimationClip) private runDownLeft: AnimationClip = null!;
    @property(AnimationClip) private runDownRight: AnimationClip = null!;

    @property(AnimationClip) private idleUp: AnimationClip = null!;
    @property(AnimationClip) private idleDown: AnimationClip = null!;
    @property(AnimationClip) private idleLeft: AnimationClip = null!;
    @property(AnimationClip) private idleRight: AnimationClip = null!;
    @property(AnimationClip) private idleUpLeft: AnimationClip = null!;
    @property(AnimationClip) private idleUpRight: AnimationClip = null!;
    @property(AnimationClip) private idleDownLeft: AnimationClip = null!;
    @property(AnimationClip) private idleDownRight: AnimationClip = null!;

    @property(AnimationClip) private jumpUp: AnimationClip = null!;
    @property(AnimationClip) private jumpDown: AnimationClip = null!;
    @property(AnimationClip) private jumpLeft: AnimationClip = null!;
    @property(AnimationClip) private jumpRight: AnimationClip = null!;

    private _dir: Vec3 = new Vec3(0, 0, 0);
    private _left: boolean = false;
    private _right: boolean = false;
    private _up: boolean = false;
    private _down: boolean = false;
    private _isShift: boolean = false;

    private currentDir: PlayerDir = PlayerDir.DOWN;
    private isRunning: boolean = false;
    private currentClipName: string = '';

    public isJumping: boolean = false;
    private jumpTimer: number = 0;

    private readonly _maxX: number = 2330;
    private readonly _minX: number = -2330;
    private readonly _maxY: number = 2133;
    private readonly _minY: number = -2133;

    private playerCollider: Collider2D | null = null;
    private spriteNode: Node | null = null;

    protected onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.playerCollider = this.getComponent(Collider2D);
        this.spriteNode = this.node.children[0];

        if (this.playerCollider) {
            this.playerCollider.on(Contact2DType.BEGIN_CONTACT, this.onTriggerEnter, this);
            this.playerCollider.on(Contact2DType.END_CONTACT, this.onTriggerExit, this);
        }
    }

    protected onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(e: EventKeyboard) {
        // --- 核心：监听 F 键 ---
        if (e.keyCode === KeyCode.KEY_F && !this.isJumping && this.canMove) {
            this.tryInteract();
        }

        if (e.keyCode === KeyCode.SPACE && !this.isJumping && this.canMove) {
            this.startJump();
        }

        // 修改：只有在 canMove 时才记录移动按键
        if (this.canMove) {
            switch (e.keyCode) {
                case KeyCode.KEY_A: this._left = true; break;
                case KeyCode.KEY_D: this._right = true; break;
                case KeyCode.KEY_W: this._up = true; break;
                case KeyCode.KEY_S: this._down = true; break;
                case KeyCode.SHIFT_LEFT:
                case KeyCode.SHIFT_RIGHT: this._isShift = true; break;
            }
        }
    }

    private onKeyUp(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_A: this._left = false; break;
            case KeyCode.KEY_D: this._right = false; break;
            case KeyCode.KEY_W: this._up = false; break;
            case KeyCode.KEY_S: this._down = false; break;
            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT: this._isShift = false; break;
        }
    }

    private startJump() {
        this.isJumping = true;
        this.jumpTimer = 0;
        this.playJumpAnimation();

        if (this.playerCollider) {
            this.playerCollider.enabled = false;
        }
    }

    private updateDirection() {
        this._dir.x = this._right ? 1 : this._left ? -1 : 0;
        this._dir.y = this._up ? 1 : this._down ? -1 : 0;
        if (this._dir.lengthSqr() > 1) this._dir.normalize();
        this.updatePlayerDir();
    }

    private updatePlayerDir() {
        // 1. 处理没有位移（停止移动）的情况
        if (this._dir.lengthSqr() === 0) {
            if (this.isClimbing) {
                // 【核心修改】：如果在藤蔓上停下，强制调用一次 playAnimation
                // 这样它会进入 playAnimation 里的 isClimbing 分支并执行 pause()
                this.playAnimation(this.currentDir);
            } else if (!this.isJumping) {
                // 只有不在藤蔓上、也不在跳跃时，才播放地面闲置动画
                this.playIdleAnimation();
            }
            return; // 停止状态直接返回
        }

        // 2. 处理有位移的情况
        let dir: PlayerDir;
        if (this._up && this._left) dir = PlayerDir.UP_LEFT;
        else if (this._up && this._right) dir = PlayerDir.UP_RIGHT;
        else if (this._down && this._left) dir = PlayerDir.DOWN_LEFT;
        else if (this._down && this._right) dir = PlayerDir.DOWN_RIGHT;
        else if (this._up) dir = PlayerDir.UP;
        else if (this._down) dir = PlayerDir.DOWN;
        else if (this._left) dir = PlayerDir.LEFT;
        else if (this._right) dir = PlayerDir.RIGHT;
        else return;

        this.changeDir(dir);
    }

    private changeDir(dir: PlayerDir) {
        this.currentDir = dir;
        this.isRunning = this._isShift;

        if (!this.isJumping) {
            this.playAnimation(dir);
        }
    }

    private playAnimation(dir: PlayerDir) {
        let clip: AnimationClip | null = null;

        // --- 1. 处理攀爬逻辑 ---
        if (this.isClimbing) {
            // 根据方向选择对应的攀爬动画
            switch (dir) {
                case PlayerDir.UP: case PlayerDir.UP_LEFT: case PlayerDir.UP_RIGHT: clip = this.climbUp; break;
                case PlayerDir.DOWN: case PlayerDir.DOWN_LEFT: case PlayerDir.DOWN_RIGHT: clip = this.climbDown; break;
                case PlayerDir.LEFT: clip = this.climbLeft; break;
                case PlayerDir.RIGHT: clip = this.climbRight; break;
            }

            // 切换动画剪辑
            if (clip && clip.name !== this.currentClipName) {
                this.currentClipName = clip.name;
                this.playerAnim.play(clip.name);
            }

            // --- 核心：处理暂停与恢复 ---
            if (this._dir.lengthSqr() === 0) {
                // 如果在藤蔓上且没有按键移动，暂停动画（停在当前帧）
                this.playerAnim.pause();
            } else {
                // 如果有按键移动，恢复播放
                // 注意：有些版本用 resume()，如果报错可以尝试 play(this.currentClipName)
                this.playerAnim.resume();
            }

            return; // 攀爬逻辑结束，不执行下方的行走/运行逻辑
        }

        // --- 2. 确保离开藤蔓后动画状态是恢复的 ---
        // 只有在非攀爬状态下，若动画是暂停的，需要恢复它
        // (防止从藤蔓静止状态直接跳下地面导致动画卡住)
        this.playerAnim.resume();

        // --- 3. 原有的 行走/运行 逻辑 ---
        if (this.isRunning) {
            switch (dir) {
                case PlayerDir.UP: clip = this.runUp; break;
                case PlayerDir.DOWN: clip = this.runDown; break;
                case PlayerDir.LEFT: clip = this.runLeft; break;
                case PlayerDir.RIGHT: clip = this.runRight; break;
                case PlayerDir.UP_LEFT: clip = this.runUpLeft; break;
                case PlayerDir.UP_RIGHT: clip = this.runUpRight; break;
                case PlayerDir.DOWN_LEFT: clip = this.runDownLeft; break;
                case PlayerDir.DOWN_RIGHT: clip = this.runDownRight; break;
            }
        } else {
            switch (dir) {
                case PlayerDir.UP: clip = this.walkUp; break;
                case PlayerDir.DOWN: clip = this.walkDown; break;
                case PlayerDir.LEFT: clip = this.walkLeft; break;
                case PlayerDir.RIGHT: clip = this.walkRight; break;
                case PlayerDir.UP_LEFT: clip = this.walkUpLeft; break;
                case PlayerDir.UP_RIGHT: clip = this.walkUpRight; break;
                case PlayerDir.DOWN_LEFT: clip = this.walkDownLeft; break;
                case PlayerDir.DOWN_RIGHT: clip = this.walkDownRight; break;
            }
        }
        if (clip && clip.name !== this.currentClipName) {
            this.currentClipName = clip.name;
            this.playerAnim.play(clip.name);
        }
    }

    private playJumpAnimation() {
        let clip: AnimationClip | null = null;
        switch (this.currentDir) {
            case PlayerDir.UP: clip = this.jumpUp; break;
            case PlayerDir.DOWN: clip = this.jumpDown; break;
            case PlayerDir.LEFT: clip = this.jumpLeft; break;
            case PlayerDir.RIGHT: clip = this.jumpRight; break;
        }
        if (clip) {
            this.currentClipName = clip.name;
            this.playerAnim.play(clip.name);
        }
    }

    private playIdleAnimation() {
        let clip: AnimationClip | null = null;
        switch (this.currentDir) {
            case PlayerDir.UP: clip = this.idleUp; break;
            case PlayerDir.DOWN: clip = this.idleDown; break;
            case PlayerDir.LEFT: clip = this.idleLeft; break;
            case PlayerDir.RIGHT: clip = this.idleRight; break;
            case PlayerDir.UP_LEFT: clip = this.idleUpLeft; break;
            case PlayerDir.UP_RIGHT: clip = this.idleUpRight; break;
            case PlayerDir.DOWN_LEFT: clip = this.idleDownLeft; break;
            case PlayerDir.DOWN_RIGHT: clip = this.idleDownRight; break;
        }
        if (clip && clip.name !== this.currentClipName) {
            this.currentClipName = clip.name;
            this.playerAnim.play(clip.name);
        }
    }

    public stopMovement() {
        this._left = this._right = this._up = this._down = false;
        this._dir.set(0, 0, 0);
        this.playIdleAnimation();
    }

    private onTriggerEnter(self: Collider2D, other: Collider2D) {
        // 检测 NPC (原有逻辑)
        const npc = other.getComponent(NPCEntity);
        if (npc) { console.log("靠近NPC, 按f键对话"); this.currentNPC = npc; return; }

        // 检测藤蔓 (新增逻辑: 假设藤蔓节点的 Tag 为 10)
        if (other.node.name.includes("Vine")) {
            this.isClimbing = true;
            console.log("进入藤蔓区域");
        }
    }

    private onTriggerExit(self: Collider2D, other: Collider2D) {
        if (other.getComponent(NPCEntity)) {
            this.currentNPC = null;
            console.log("离开NPC区域");
        }

        // 离开藤蔓
        if (other.node.name.includes("Vine")) {
            this.isClimbing = false;
            console.log("离开藤蔓区域");
        }
    }

    private tryInteract() {
        if (!this.currentNPC || this.isInteracting) return;

        // 1) 对话型NPC
        if (this.currentNPC.interactType === NPCInteractType.Dialogue) {
            if (this.dialogueManager) {
                this.dialogueManager.loadDialogueData(this.currentNPC.dialogueFileName);
            }
            return;
        }
        // 2) 纯动画互动型NPC
        this.playNpcInteraction(this.currentNPC);
    }

    private playNpcInteraction(npc: NPCEntity) {
        const npcAnimComp = npc.getComponent(Animation);
        if (!npcAnimComp || !npc.npcAnim || !this.playerAnim) return;

        this.isInteracting = true;
        npc.isInteracting = true;
        this.canMove = false;
        this.stopMovement(); // 清除之前的移动惯性

        // 播放 NPC 动画
        npcAnimComp.play(npc.npcAnim.name);
        const npcState = npcAnimComp.getState(npc.npcAnim.name);
        if (npcState) {
            npcState.wrapMode = npc.loopAfterInteract ? AnimationClip.WrapMode.Loop : AnimationClip.WrapMode.Normal;
        }

        // 播放玩家动画
        if (npc.playerInteractAnim) {
            this.currentClipName = npc.playerInteractAnim.name;
            this.playerAnim.play(npc.playerInteractAnim.name);

            const playerState = this.playerAnim.getState(npc.playerInteractAnim.name);
            if (playerState) {
                // 【强制】交互动作不许循环，否则会造成永久卡死
                playerState.wrapMode = AnimationClip.WrapMode.Normal;
            }

            // 监听完成事件
            this.playerAnim.once(Animation.EventType.FINISHED, () => {
                this.finishInteraction(npc);
            }, this);

            // 【额外保险】：如果动画出Bug没触发结束，3秒后强制恢复（时间可调）
            this.scheduleOnce(() => {
                if (this.isInteracting) this.finishInteraction(npc);
            }, 3);
        } else {
            this.finishInteraction(npc);
        }
    }
    private finishInteraction(npc: NPCEntity) {
        this.canMove = true;
        this.isInteracting = false;
        npc.isInteracting = false;
        this.playIdleAnimation(); // 播放待机动作
        console.log("状态恢复成功");
    }

    update(deltaTime: number) {
        // --- 1. 修改锁定逻辑 ---
        // 不要在这里 return，因为我们需要让下方的跳跃逻辑跑完
        if (!this.canMove && !this.isInteracting) {
            this._dir.set(0, 0, 0); // 仅强制清空移动方向
            // 这里不 return
        }

        if (this.isInteracting) return;

        // 只有在能移动时才处理方向（防止对话中通过按键改变朝向）
        if (this.canMove) {
            this.updateDirection();
        }

        // --- 2. 处理跳跃（这里必须保证能一直运行） ---
        if (this.isJumping) {
            this.jumpTimer += deltaTime;
            const progress = this.jumpTimer / this.jumpDuration;
            if (this.spriteNode) {
                const offset = Math.sin(progress * Math.PI) * this.jumpOffset;
                this.spriteNode.setPosition(0, offset, 0);
            }
            if (this.jumpTimer >= this.jumpDuration) {
                this.isJumping = false;
                if (this.spriteNode) this.spriteNode.setPosition(0, 0, 0);
                if (this.playerCollider) {
                    this.playerCollider.enabled = true; // 确保恢复碰撞
                    console.log("跳跃结束，碰撞体恢复");
                }
            }
        }

        // --- 3. 移动物理逻辑（受 canMove 控制） ---
        if (this.canMove) {
            let currentSpeed = this.isClimbing ? this.climbSpeed : (this._isShift ? this.runSpeed : this.walkSpeed);
            const moveDelta = Vec3.multiplyScalar(new Vec3(), this._dir, currentSpeed * deltaTime);
            const targetPos = new Vec3();
            Vec3.add(targetPos, this.node.position, moveDelta);
            // ... 边界限制逻辑 ...
            this.node.setPosition(targetPos);
        }
    }
}