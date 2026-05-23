export async function fetchFile(id, type, specialParams, edpFetch, tokenState) {
    const { idDevoir } = specialParams;
    return await edpFetch(
        `https://api.ecoledirecte.com/v3/telechargement.awp?verbe=get&fichierId=${id}&leTypeDeFichier=${type}${idDevoir ? `&idDevoir=${idDevoir}` : ""}`,
        {
            method: "POST",
            headers: {
                "x-token": tokenState
            },
            cors: "no-cors",
            body: `data=${JSON.stringify({ forceDownload: 0 })}`,
            referrerPolicy: "no-referrer"
        },
        "blob"
    )
    .catch(error => console.error('Erreur lors du téléchargement du fichier:', error));
}

export class File {
    constructor(id, type, file, name = file.slice(0, file.lastIndexOf(".")), specialParams = {}) {
        /**id : 5018 / "654123546545612654984.pdf"
         * type : NODEVOIR / FICHIER_CDT
         * file : "file.pdf" / "TEST.txt"
         * name : "the_name_of_the_file_downloaded_without_extension"
         * specialParams : params needed in the URL in certains cases
         */
        this.id = id;
        this.type = type;
        this.name = name;
        this.extension = file.slice(file.lastIndexOf(".") + 1);
        this.specialParams = specialParams;
        this.state = "inactive";
    }

    fetch(edpFetch, tokenState) {
        if (!this.blob) {
            if (this.state !== "requestForInstall") {
                this.state = "fetching";
            }
            fetchFile(this.id, this.type, this.specialParams, edpFetch, tokenState)
                .then(blob => {
                    this.blob = blob;
                    if (this.state === "requestForInstall") {
                        this.install();
                    }
                });
        }
    }

    download(edpFetch, tokenState) {
        if (this.blob) {
            this.install();
        } else if (this.state === "fetching") {
            this.state = "requestForInstall";
        } else {
            this.state = "requestForInstall";
            this.fetch(edpFetch, tokenState);
        }
    }

    async install() {
        const url = URL.createObjectURL(this.blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `${this.name}.${this.extension}`;

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
