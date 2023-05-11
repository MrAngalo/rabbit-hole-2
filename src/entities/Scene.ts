import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent } from "typeorm";
import { SceneRating } from "./Rating";
import { User } from "./User";

// @Tree('materialized-path')
@Entity('scenes')
export class Scene extends BaseEntity {
    private static MAX_CHILDREN = 3;

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Scene, scene => scene.children)
    @JoinColumn()
    // @Column({ select: false })
    // @TreeParent()
    parent: Scene;

    @OneToMany(() => Scene, scene => scene.parent)
    // @TreeChildren()
    children: Scene[];

    @Column()
    creator_name: string;

    @ManyToOne(() => User, user => user.scenes)
    @JoinColumn()
    // @Column({ select: false })
    creator: User;

    @Column()
    title: string;

    @Column()
    description: string;
    
    @Column({type: "integer"})
    gifId: number;

    @CreateDateColumn()
    created: Date;

    @Column({type: "integer", default: 0})
    likes: number;

    @Column({type: "integer", default: 0})
    dislikes: number;

    @OneToMany(() => SceneRating, rating => rating.scene)
    rated_by: SceneRating[];

    hasFreeChildSlot() {
        return this.children.length < Scene.MAX_CHILDREN;
    }
}
