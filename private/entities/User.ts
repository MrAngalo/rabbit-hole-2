import { BaseEntity, Entity, Column, CreateDateColumn, OneToMany, PrimaryGeneratedColumn, Generated } from "typeorm";
import { UserRating, SceneRating } from "./Rating";
import { Scene } from "./Scene";
import { Token, TokenType } from "./Token";

@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({unique: true})
    username_lower: string;

    @Column({unique: true})
    username: string;

    @Column({unique: true, select: false})
    email: string;

    @Column({select: false})
    password: string;

    @Column({default: false})
    confirmed: boolean;

    @Column({type: "integer", default: 0})
    permission: number;

    @CreateDateColumn()
    created: Date;

    @Column({type: "integer", default: 0})
    likes: number;

    @Column({type: "integer", default: 0})
    dislikes: number;

    @OneToMany(() => Scene, scene => scene.creator)
    scenes: Scene[]

    @OneToMany(() => UserRating, rating => rating.recipient)
    rated_by: UserRating[];

    @OneToMany(() => UserRating, rating => rating.owner)
    user_ratings: UserRating[];

    @OneToMany(() => SceneRating, rating => rating.owner)
    scene_ratings: SceneRating[];

    @OneToMany(() => Token, token => token.owner)
    tokens: Token[];

    public getToken(type: TokenType) : Token | null {
        if (!this.tokens) return null;
        for (let i = 0; i < this.tokens.length; i++) {
            if (this.tokens[i].type == type) {
                return this.tokens[i];
            }
        }
        return null;
    }

    public async updateToken(token: Token) : Promise<void> {
        let oldToken = this.getToken(token.type);
        if (oldToken != null) {
            await this.removeToken(oldToken);
        }
        token.owner = this;
        await token.save();
    }

    public async removeToken(token: Token) : Promise<void> {
        await token.remove();
    }
}