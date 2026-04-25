import { _decorator, Component, ProgressBar } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LunaUI')
export class LunaUI extends Component {
    // 这里直接引用 ProgressBar 组件，而不是 Node
    @property(ProgressBar) hpBar: ProgressBar = null!;
    @property(ProgressBar) mpBar: ProgressBar = null!;

    /**
     * 更新血条
     * @param current 当前血量
     * @param max 最大血量
     */
    public updateHP(current: number, max: number) {
        // 计算 0-1 的比例
        const ratio = Math.max(0, Math.min(1, current / max));
        // 直接设置进度条的 progress
        this.hpBar.progress = ratio;
    }

    public updateMP(current: number, max: number) {
        const ratio = Math.max(0, Math.min(1, current / max));
        this.mpBar.progress = ratio;
    }
}