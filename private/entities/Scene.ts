import { BaseEntity, Column, CreateDateColumn, DataSource, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent } from "typeorm";
import { SceneRating } from "./Rating";
import { User } from "./User";
import { Badge } from "./Badges";

export enum SceneStatus {
    AWAITING_APPROVAL = 20,
    PUBLIC = 30,
}

@Entity('scenes')
export class Scene extends BaseEntity {
    private static max_children = 3;
    
    private static relations: { [key: number]: { parent: number | null, children: number[]}};
    public static scene_count = -1;
    public static last_id = -1;
    
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Scene, scene => scene.children, {nullable: true, onDelete: "SET NULL"})
    @JoinColumn()
    parent: Scene;

    @OneToMany(() => Scene, scene => scene.parent)
    children: Scene[];

    @ManyToMany(() => Badge, badge => badge.scenes, { nullable: true })
    @JoinTable({name: "scene_badge_jointable"})
    badges: Badge[];

    @ManyToOne(() => User, user => user.scenes, { nullable: true, onDelete: "SET NULL"})
    @JoinColumn()
    creator: User;

    @Column()
    creator_name: string;

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

    @Column({type: "enum", enum: SceneStatus})
    status: number;

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
            
        Scene.relations = {};
        relationsQuery.forEach(r => Scene.relations[r.child] = { parent: r.parent, children: []});
        relationsQuery.forEach(r => Scene.relations[r.parent]?.children.push(r.child)); //question mark to avoid relations[null]
        
        Scene.scene_count = relationsQuery.length -1; //removes root whose parent is null
        relationsQuery.forEach(r => { if (Scene.last_id < r.child) Scene.last_id = r.child; });
    }

    static addRelationToCache(child: number, parent: number) : boolean {
        if (Scene.relations[child]) return false; //escape if child already exists
        if (!Scene.relations[parent]) return false; //escape if parent doesn't exist

        Scene.relations[child] = { parent: parent, children: []};
        Scene.relations[parent].children.push(child); //always exists

        Scene.scene_count++;
        if (Scene.last_id < child)
            Scene.last_id = child;

        return true;
    }

    static exists(id:number) : boolean {
        return Scene.relations[id] != null;
    }

    static getIdChainToRoot(id:number) : number[] {
        const chain:number[] = [id];
        if (!Scene.relations[id]) return chain;
        while (Scene.relations[id].parent != null) {
            chain.push(Scene.relations[id].parent!)
            id = Scene.relations[id].parent!;
        }
        return chain;
    }

    static getParentId(id:number) : number | null {
        return Scene.relations[id]?.parent;
    }

    static getChildrenId(id:number) : number[] {
        return Scene.relations[id]?.children || [];
    }


    static getMaxChildren() : number {
        return Scene.max_children;
    }

    static hasFreeChildSlot(id: number) : boolean {
        return Scene.relations[id].children.length < Scene.max_children;
    }
}
