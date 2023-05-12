//https://github.com/Jinzulen/TenorJS
var Tenor:any;

var tenorutils = { initTenor, tenorIdsExist }
module.exports = tenorutils;
export = tenorutils;

function initTenor (_tenor:any) {
    Tenor = _tenor;
}

function tenorIdsExist (id:string[]) {
    return new Promise<boolean>((Resolve, Reject) => {
        // Tenor.Search.Find(id).then(() => Resolve(true)).catch(() => Resolve(false));
        Tenor.Search.Find(id).then((r:any) => {
            Resolve(true)
        }).catch((e:any) => {
            console.log(e);
            Resolve(false)
        });
    });
};