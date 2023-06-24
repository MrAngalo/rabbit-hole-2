import { BaseEntity, Entity, Column, CreateDateColumn, OneToMany, PrimaryGeneratedColumn, Generated } from "typeorm";
import { UserRating, SceneRating } from "./Rating";
import { Scene } from "./Scene";
import { Token, TokenType } from "./Token";

export enum UserPremission {
    USER = 1,
    MODERATOR = 2,
    ADMINISTRATOR = 3,
    OWNER = 4,
}

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

    @Column({type: "enum", enum: UserPremission, default: UserPremission.USER})
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

    public static validateEmail(email: string) : string | null {
        if (!email.match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
            return `Email is not valid!`;
            
        return null;
    }

    public static validateUsername(username: string) : string | null {
        if (username.length < 3)
            return `Username must contain 3 characters!`;
        
        if (username.match(/\s/))
            return `Username cannot contain spaces!`;
        
        if (!username.match(/^[A-Za-z0-9_]+$/))
            return `Username must contain valid characters!`;
        
        return null;
    }

    public static validatePassword(password: string, password2?: string) : string | null {
        if (password2 != undefined && password != password2)
            return 'Error: The passwords do not match!';

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