import { BaseEntity, Column, CreateDateColumn, DataSource, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent } from "typeorm";
import { SceneRating } from "./Rating";
import { User } from "./User";

// @Tree('materialized-path')
@Entity('scenes')
export class Scene extends BaseEntity {
    private static maxChildren = 3;
    private static relations: { [key: number]: { parent: number, children: number[]}};

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

    static async createRelationsCache (dataSource: DataSource) : Promise<void> {
        //queries list [{ child: 0, parent: null }, { child: 1, parent: 0 }, ...]
        const relationsQuery = await dataSource.getRepository(Scene)
            .createQueryBuilder('scene')
            .select([
                'scene.id AS child', /* never repeats */
                'scene.parentId AS parent', /* repeats */
            ])
            .getRawMany();
            
        Scene.relations = {}
        relationsQuery.forEach(r => Scene.relations[r.child] = { parent: r.parent, children: []});
        relationsQuery.forEach(r => Scene.relations[r.parent]?.children.push(r.child)); //question mark to avoid relations[null]
    }

    static addRelationToCache(child: number, parent: number) : boolean {
        if (Scene.relations[child]) return false; //escape if child already exists
        if (!Scene.relations[parent]) return false; //escape if parent doesn't exist

        Scene.relations[child] = { parent: parent, children: []};
        Scene.relations[parent].children.push(child);
        return true;
    }

    static getParentIdChainToRoot(id:number) : number[] {
        const chain:number[] = [];
        if (!Scene.relations[id]) return chain;
        while (Scene.relations[id].parent != null) {
            chain.push(Scene.relations[id].parent)
            id = Scene.relations[id].parent;
        }
        return chain;
    }

    static getMaxChildren() : number {
        return Scene.maxChildren;
    }

    static hasFreeChildSlot(id: number) : boolean {
        return Scene.relations[id].children.length < Scene.maxChildren;
    }
}
