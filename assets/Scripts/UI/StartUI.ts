import { _decorator, Component, Node, director, game } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('StartUI')
export class StartUI extends Component {

    // 编辑器中拖拽绑定按钮
    @property(Node)
    startBtn: Node = null!;   // 开始游戏按钮

    @property(Node)
    exitBtn: Node = null!;    // 退出游戏按钮

    onLoad() {
        // 绑定点击事件
        this.startBtn.on(Node.EventType.TOUCH_END, this.onStartGame, this);
        this.exitBtn.on(Node.EventType.TOUCH_END, this.onExitGame, this);
    }

    // 开始游戏 → 跳转到 Main_Scene
    onStartGame() {
        console.log("切换到游戏场景");
        director.loadScene("Main_Scene");
    }

    // 退出游戏
    onExitGame() {
        console.log("退出游戏");
        game.end();
    }
}