import { BaseEntity, Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Scene } from "./Scene";

@Entity('badges')
export class Badge extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToMany(() => Scene, scene => scene.badges)
    scenes: Scene[];

    @Column()
    name: string;
    
    @Column()
    icon_path: string;

    @Column()
    icon_color: string;

    @Column()
    description: string;
}