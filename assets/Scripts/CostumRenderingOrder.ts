import { _decorator, Component, Node } from 'cc';
import { PlayerMove } from './LunaController';
const { ccclass, property } = _decorator;

@ccclass('CostumRenderingOrder')
export class CostumRenderingOrder extends Component {

    @property({ type: Node })
    private playerNode: Node = null!;

    private playerMove: PlayerMove | null = null;

    startBtn() {
        if (this.playerNode) {
            this.playerMove = this.playerNode.getComponent(PlayerMove);
        }
    }

    update(deltaTime: number) {
        if (!this.playerNode) return;

        const allChildren = this.node.children;
        const otherNodes: Node[] = [];
        let isJumping = false;

        if (this.playerMove) {
            isJumping = this.playerMove.isJumping;
        }

        // 分开角色和其他物体
        for (const node of allChildren) {
            if (node !== this.playerNode) {
                otherNodes.push(node);
            }
        }

        // 其他节点按 Y 轴排序
        otherNodes.sort((a, b) => b.position.y - a.position.y);

        let sortedNodes: Node[];

        if (isJumping) {
            // 跳跃 → 角色在最上层
            sortedNodes = [...otherNodes, this.playerNode];
        } else {
            // 不跳跃 → 正常参与深度排序
            sortedNodes = [...otherNodes, this.playerNode];
            sortedNodes.sort((a, b) => b.position.y - a.position.y);
        }

        // 设置渲染顺序
        sortedNodes.forEach((node, idx) => {
            node.setSiblingIndex(idx);
        });
    }
}