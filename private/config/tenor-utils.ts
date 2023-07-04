//https://github.com/Jinzulen/TenorJS
let Tenor:any;

export function initTenor (Credentials: any) {
    Tenor = require("tenorjs").client(Credentials);
    if (process.env.TENOR_API_VERSION! == '1') {
        Credentials.Gate = "https://g.tenor.com/v1"; //overrides the value set in the above function
    }
    // else if (process.env.TENOR_API_VERSION! == '2') {
    //     Credentials.Gate = "https://tenor.googleapis.com/v2";
    // }

    return Tenor;
}

export async function validateTenor() {
    //checks if tenor has been initialized and can load a gif
    return (Tenor != null) && (await tenorIdsExist(["23616422"]));
}

export function tenorIdsExist (id:string[]) {
    return new Promise<boolean>((Resolve, Reject) => {
        Tenor.Search.Find(id).then((r:any) => {
            Resolve(true);
        }).catch((e:any) => {
            console.log(e);
            Resolve(false);
        });
    });
};