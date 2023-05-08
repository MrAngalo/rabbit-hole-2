import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Scene } from "./Scene";
import { User } from "./User";

export enum RatingType {
    POSITIVE = +1,
    NEGATIVE = -1
}

export abstract class Rating extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: "enum", enum: RatingType})
    type: number;
}

@Entity('user_rating')
export class UserRating extends Rating {
    @ManyToOne(() => User, user => user.user_ratings)
    @JoinColumn()
    owner: User;

    @ManyToOne(() => User, user => user.rated_by)
    @JoinColumn()
    recipient: User;
}

@Entity('scene_rating')
export class SceneRating extends Rating {
    @ManyToOne(() => User, user => user.scene_ratings)
    @JoinColumn()
    owner: User;

    @ManyToOne(() => Scene, scene => scene.rated_by)
    @JoinColumn()
    scene: Scene;
}