import { BaseEntity, Entity, Column, CreateDateColumn, OneToMany, PrimaryGeneratedColumn, Generated, OneToOne } from "typeorm";
import { UserRating, SceneRating } from "./Rating";
import { Scene } from "./Scene";
import { Token } from "./Token";
import { ApiUserToken } from "./ApiUserToken";

export enum UserPremission {
    VISITOR = 5,
    TRUSTED = 10,
    MODERATOR = 80,
    ADMINISTRATOR = 90,
    OWNER = 100,
}

@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({unique: true, select: false})
    username_lower: string;

    @Column({unique: true})
    username: string;

    @Column({unique: true, select: false})
    email: string;

    @Column({select: false})
    password: string;

    @Column({default: false, select: false})
    confirmed: boolean;

    @Column({type: "enum", enum: UserPremission, default: UserPremission.VISITOR})
    permission: number;

    @CreateDateColumn({select: false})
    created: Date;

    @Column({type: "integer", default: 0, select: false})
    likes: number;

    @Column({type: "integer", default: 0, select: false})
    dislikes: number;

    @Column({type: "integer", default: 0, select: false})
    score: number;

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

    @OneToMany(() => ApiUserToken, usertoken => usertoken.user, { nullable: true })
    apitokens: ApiUserToken[];

    public static validateEmail(email?: string) : string | null {
        if (email == null)
            return `Email must be defined!`;

        if (!email.match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
            return `Email is not valid!`;
            
        return null;
    }

    public static validateUsername(username?: string) : string | null {
        if (username == null)
            return `Username must be defined!`;

        if (username.length < 3)
            return `Username must contain 3 characters!`;
        
        if (username.match(/\s/))
            return `Username cannot contain spaces!`;
        
        if (!username.match(/^[A-Za-z0-9_]+$/))
            return `Username must contain valid characters!`;
        
        return null;
    }

    public static validatePassword(password?: string) : string | null {
        if (password == null)
            return 'Password must be defiend!';

        if (password.length < 8)
            return `Password must contain 8 characters!`;
          
        if (password.match(/\s/))
            return `Password cannot contain spaces!`;
          
        if (!password.match(/^[A-Za-z0-9!@#$%^&*]+$/))
            return `Password must contain valid characters!`;
          
        // if (!password.match(/[A-Z]/g))
        //   return `Password must contain one uppercase letter`;
          
        if (!password.match(/[0-9]/g))
            return `Password must contain one number`;
              
        // if (!password.match(/[!@#$%^&*]/g))
        //   return `Password must contain one special character`;

        return null;
    }
}