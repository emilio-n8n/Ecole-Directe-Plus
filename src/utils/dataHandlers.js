import {
    getGradeValue,
    calcAverage,
    findCategory,
    calcCategoryAverage,
    calcGeneralAverage,
    formatSkills,
    safeParseFloat,
    calcClassGeneralAverage,
    calcClassAverage
} from "./gradesTools";
import { File } from "./file";

export function calculateDefaultPeriod(sortedGrades) {
    let currentPeriod = 0;
    const keys = Object.keys(sortedGrades);
    for (let periodCode in sortedGrades) {
        if (Date.now() > sortedGrades[periodCode].endDate) {
            if (currentPeriod < keys.length - 1) {
                currentPeriod++;
            }
        }
    }
    return keys[currentPeriod];
}

export function sortGrades(grades, activeAccount) {
    const periodsFromJson = grades[activeAccount].periodes;
    const periods = {};
    const generalAverageHistory = {};
    const classGeneralAverageHistory = {};
    const streakScoreHistory = {};
    const subjectsComparativeInformation = {};
    const totalBadges = {
        "star": 0,
        "bestStudent": 0,
        "greatStudent": 0,
        "stonks": 0,
        "keepOnFire": 0,
        "meh": 0,
    };
    const newLastGrades = [];
    if (periodsFromJson !== undefined) {
        for (let period of periodsFromJson) {
            if (period) {
                const newPeriod = {};
                subjectsComparativeInformation[period.codePeriode] = [];

                newPeriod.streak = 0;
                newPeriod.maxStreak = 0;
                newPeriod.name = period.periode;
                newPeriod.code = period.codePeriode;
                newPeriod.startDate = new Date(period.dateDebut);
                newPeriod.endDate = new Date(period.dateFin);
                newPeriod.isMockExam = period.examenBlanc;
                newPeriod.MTname = period.ensembleMatieres.nomPP;
                newPeriod.MTapreciation = period.ensembleMatieres.appreciationPP;
                newPeriod.classGeneralAverage = period.ensembleMatieres.moyenneClasse;
                newPeriod.subjects = {};
                let i = 0;
                for (let matiere of period.ensembleMatieres.disciplines) {
                    let subjectCode = matiere.codeMatiere + matiere.codeSousMatiere;
                    if (matiere.groupeMatiere) {
                        subjectCode = "category" + i.toString();
                        i++;
                    }
                    const newSubject = {};
                    newSubject.code = subjectCode;
                    newSubject.elementType = "subject";
                    newSubject.id = matiere.id.toString();
                    if (matiere.sousMatiere) {
                        newSubject.name = matiere.codeMatiere + " - " + matiere.codeSousMatiere;
                    } else {
                        newSubject.name = matiere.discipline.replace(". ", ".").replace(".", ". ");
                    }
                    newSubject.classAverage = safeParseFloat(matiere.moyenneClasse);
                    newSubject.minAverage = safeParseFloat(matiere.moyenneMin);
                    newSubject.maxAverage = safeParseFloat(matiere.moyenneMax);
                    newSubject.coef = matiere.coef;
                    newSubject.size = matiere.effectif;
                    newSubject.rank = matiere.rang;
                    newSubject.isCategory = matiere.groupeMatiere;
                    newSubject.isSubSubject = matiere.sousMatiere;
                    newSubject.teachers = matiere.professeurs;
                    newSubject.appreciations = matiere.appreciations;
                    newSubject.grades = [];
                    newSubject.average = "N/A";
                    newSubject.streak = 0;
                    newSubject.badges = {
                        star: 0,
                        bestStudent: 0,
                        greatStudent: 0,
                        stonks: 0,
                        keepOnFire: 0,
                        meh: 0,
                    }
                    newPeriod.subjects[subjectCode] = newSubject;
                    subjectsComparativeInformation[period.codePeriode].push({
                        subjectFullname: newSubject.name,
                        classAverage: newSubject.classAverage,
                        minAverage: newSubject.minAverage,
                        maxAverage: newSubject.maxAverage
                    });
                }
                periods[period.codePeriode] = newPeriod;
                generalAverageHistory[period.codePeriode] = { generalAverages: [], dates: [] };
                classGeneralAverageHistory[period.codePeriode] = { classGeneralAverages: [], dates: [] };
                streakScoreHistory[period.codePeriode] = [];
            }
        }
        const gradesFromJson = grades[activeAccount].notes;
        if (gradesFromJson !== undefined) {
            const subjectDatas = {};

            const lastGrades = [...gradesFromJson].sort((elA, elB) => (new Date(elA.dateSaisie)).getTime() - (new Date(elB.dateSaisie)).getTime()).slice(-3);

            for (let grade of (gradesFromJson ?? [])) {
            let tempPeriodCode = grade.codePeriode;
            let newPeriodCode = tempPeriodCode;
            if (periods[tempPeriodCode].isMockExam) {
                newPeriodCode = tempPeriodCode.slice(0, 4);
                if (periods[newPeriodCode] === undefined) {
                    newPeriodCode = Object.keys(periods)[Object.keys(periods).indexOf(tempPeriodCode) - 1];
                    newPeriodCode = Object.keys(periods)[Object.keys(periods).indexOf(tempPeriodCode) - 1];
                }
            }

            const periodCode = newPeriodCode;
            const subjectCode = grade.codeMatiere + grade.codeSousMatiere;
            if (periods[periodCode].subjects[subjectCode] === undefined) {
                periods[periodCode].subjects[subjectCode] = {
                    code: subjectCode,
                    elementType: "subject",
                    name: subjectCode,
                    classAverage: "N/A",
                    minAverage: "N/A",
                    maxAverage: "N/A",
                    coef: 1,
                    size: "N/A",
                    isCategory: false,
                    teachers: [],
                    appreciations: [],
                    grades: [],
                    average: 20,
                    streak: 0,
                    badges: {
                        star: 0,
                        bestStudent: 0,
                        greatStudent: 0,
                        stonks: 0,
                        keepOnFire: 0,
                        meh: 0,
                    }
                }
            }

            const newGrade = {};
            newGrade.elementType = "grade";
            newGrade.id = grade.id.toString();
            newGrade.name = grade.devoir;
            newGrade.type = grade.typeDevoir;
            newGrade.date = new Date(grade.date);
            newGrade.entryDate = new Date(grade.dateSaisie);
            newGrade.coef = safeParseFloat(grade.coef);
            newGrade.scale = safeParseFloat(grade.noteSur);
            newGrade.value = getGradeValue(grade.valeur);
            newGrade.classMin = safeParseFloat(grade.minClasse);
            newGrade.classMax = safeParseFloat(grade.maxClasse);
            newGrade.classAverage = safeParseFloat(grade.moyenneClasse);
            newGrade.subjectName = grade.libelleMatiere;
            newGrade.isSignificant = !grade.nonSignificatif;
            newGrade.examSubjectSRC = grade.uncSujet === "" ? undefined : new File(grade.uncSujet, "NODEVOIR", grade.uncSujet, `sujet-${grade.devoir}-${grade.subjectCode}`, { idDevoir: grade.id });
            newGrade.examCorrectionSRC = grade.uncCorrige === "" ? undefined : new File(grade.uncCorrige, "NODEVOIR", grade.uncCorrige, `correction-${grade.devoir}-${grade.subjectCode}`, { idDevoir: grade.id });
            newGrade.isReal = true;

            if (!subjectDatas.hasOwnProperty(periodCode)) {
                subjectDatas[periodCode] = {};
            }
            if (!subjectDatas[periodCode].hasOwnProperty(subjectCode)) {
                subjectDatas[periodCode][subjectCode] = [];
            }
            subjectDatas[periodCode][subjectCode].push({ value: newGrade.value, coef: newGrade.coef, scale: newGrade.scale, isSignificant: newGrade.isSignificant, classAverage: newGrade.classAverage });
            const nbSubjectGrades = periods[periodCode].subjects[subjectCode]?.grades.filter((el) => el.isSignificant).length ?? 0;
            const subjectAverage = periods[periodCode].subjects[subjectCode].average;
            const oldGeneralAverage = isNaN(periods[periodCode]?.generalAverage) ? 10 : periods[periodCode]?.generalAverage;
            const average = calcAverage(subjectDatas[periodCode][subjectCode]);
            const classAverage = calcClassAverage(subjectDatas[periodCode][subjectCode]);

            newGrade.upTheStreak = (!isNaN(newGrade.value) && newGrade.isSignificant && (nbSubjectGrades > 0 ? subjectAverage : oldGeneralAverage) <= average);
            if (newGrade.upTheStreak) {
                periods[periodCode].streak += 1;
                if (periods[periodCode].streak > periods[periodCode].maxStreak) {
                    periods[periodCode].maxStreak = periods[periodCode].streak;
                }
                periods[periodCode].totalStreak += 1;
                periods[periodCode].subjects[subjectCode].streak += 1;
            } else {
                if (newGrade.isSignificant && !["Abs", "Disp", "NE", "EA", "Comp"].includes(newGrade.value)) {
                    periods[periodCode].streak -= periods[periodCode].subjects[subjectCode].streak;
                    periods[periodCode].subjects[subjectCode].streak = 0;

                    for (let grade of periods[periodCode].subjects[subjectCode].grades) {
                        if (grade.upTheStreak) {
                            grade.upTheStreak = "maybe";
                        }
                    }
                }
            }
            streakScoreHistory[periodCode].push(periods[periodCode].streak);

            periods[periodCode].subjects[subjectCode].average = average;
            periods[periodCode].subjects[subjectCode].classAverage = classAverage;

            const category = findCategory(periods[periodCode], subjectCode);
            if (category !== null) {
                const categoryAverage = calcCategoryAverage(periods[periodCode], category);
                periods[periodCode].subjects[category.code].average = categoryAverage;
            }
            const generalAverage = calcGeneralAverage(periods[periodCode]);
            generalAverageHistory[periodCode].generalAverages.push(generalAverage);
            generalAverageHistory[periodCode].dates.push(newGrade.date);
            periods[periodCode].generalAverage = generalAverage;

            const classGeneralAverage = calcClassGeneralAverage(periods[periodCode]);
            classGeneralAverageHistory[periodCode].classGeneralAverages.push(classGeneralAverage);
            classGeneralAverageHistory[periodCode].dates.push(newGrade.date);
            periods[periodCode].classGeneralAverage = classGeneralAverage;

            const gradeBadges = [];
            if (!isNaN(newGrade.value)) {
                if (newGrade.value === newGrade.scale) {
                    gradeBadges.push("star");
                    periods[periodCode].subjects[subjectCode].badges.star++
                    totalBadges.star++
                }
                if (newGrade.value === newGrade.classMax) {
                    gradeBadges.push("bestStudent");
                    periods[periodCode].subjects[subjectCode].badges.bestStudent++
                    totalBadges.bestStudent++
                }
                if (newGrade.value > newGrade.classAverage) {
                    gradeBadges.push("greatStudent");
                    periods[periodCode].subjects[subjectCode].badges.greatStudent++
                    totalBadges.greatStudent++
                }
                if ((newGrade.value / newGrade.scale * 20) > subjectAverage) {
                    gradeBadges.push("stonks");
                    periods[periodCode].subjects[subjectCode].badges.stonks++
                    totalBadges.stonks++
                }
                if (newGrade.upTheStreak) {
                    gradeBadges.push("keepOnFire");
                    periods[periodCode].subjects[subjectCode].badges.keepOnFire++
                    totalBadges.keepOnFire++
                }
                if ((newGrade.value / newGrade.scale * 20) === subjectAverage) {
                    gradeBadges.push("meh");
                    periods[periodCode].subjects[subjectCode].badges.meh++
                    totalBadges.meh++
                }
            }
            newGrade.badges = gradeBadges;
            newGrade.skill = formatSkills(grade.elementsProgramme)

            periods[periodCode].subjects[subjectCode].grades.push(newGrade);
            if (lastGrades.includes(grade)) {
                newLastGrades.push(newGrade)
            }
        }
    }
    }

    let i = 0;
    let firstPeriod;
    for (const key in periods) {
        if (i === 0) {
            firstPeriod = { key: key, value: periods[key] }
        }
        i++;
        let isEmpty = true;
        if (periods[key])
            for (const subject in periods[key].subjects) {
                if (periods[key].subjects[subject].grades.length !== 0) {
                    isEmpty = false;
                }
            }
        if (isEmpty || periods[key].isMockExam) {
            delete periods[key];
        }
    }
    if (firstPeriod !== undefined && Object.keys(periods).length < 1) {
        periods[firstPeriod.key] = firstPeriod.value;
    }

    const settings = grades[activeAccount].parametrage;
    const enabledFeatures = {};

    enabledFeatures.moyenneMin = settings.moyenneMin;
    enabledFeatures.moyenneMax = settings.moyenneMax;
    enabledFeatures.coefficient = settings.coefficientNote;
    enabledFeatures.rank = settings.moyenneRang;

    for (const period in periods) {
        for (const subject in periods[period].subjects) {
            for (const subjectID in subjectsComparativeInformation[period]) {
                if (periods[period].subjects[subject].name === subjectsComparativeInformation[period][subjectID].subjectFullname) {
                    const newAverage = periods[period].subjects[subject].average;
                    if (newAverage === "N/A" || periods[period].subjects[subject].classAverage === "N/A" || periods[period].subjects[subject].code.includes("category")) {
                        subjectsComparativeInformation[period].splice(subjectID, 1);
                        break;
                    }
                    subjectsComparativeInformation[period][subjectID].average = newAverage;
                    break;
                }
            }
        }
    }

    return {
        totalBadges,
        sortedGrades: periods,
        generalAverageHistory,
        classGeneralAverageHistory,
        streakScoreHistory,
        subjectsComparativeInformation,
        gradesEnabledFeatures: enabledFeatures,
        lastGrades: newLastGrades.reverse(),
        activePeriod: calculateDefaultPeriod(periods)
    };
}

export function sortNextHomeworks(homeworks) {
    const upcomingAssignments = []
    const sortedHomeworks = Object.fromEntries(Object.entries(homeworks).map((day) => {
        return [day[0], day[1].map((homework, i) => {
            const { codeMatiere, aFaire, donneLe, effectue, idDevoir, interrogation, matiere } = homework;
            const task = {
                id: idDevoir,
                type: aFaire ? "task" : "sessionContent",
                subjectCode: codeMatiere,
                subject: matiere,
                addDate: donneLe,
                isInterrogation: interrogation,
                isDone: effectue,
            }

            if (interrogation && upcomingAssignments.length < 3) {
                upcomingAssignments.push({
                    date: day[0],
                    id: idDevoir,
                    index: i,
                    subject: matiere,
                    subjectCode: codeMatiere,
                });
            }

            return task;
        })]
    }))

    if (upcomingAssignments.length > 0) {
        let i = 0;
        while (upcomingAssignments.length < 3) {
            upcomingAssignments.push({
                id: "dummy" + i,
            });
            i++;
        }
    }
    return {
        sortedHomeworks,
        upcomingAssignments
    };
}

export function sortDayHomeworks(homeworks) {
    const sortedHomeworks = Object.fromEntries(Object.entries(homeworks).map((day) => {
        return [day[0], day[1].map((homework) => {
            const { aFaire, codeMatiere, id, interrogation, matiere, nomProf } = homework;
            let contenuDeSeance = homework.contenuDeSeance;
            if (!aFaire && !contenuDeSeance) {
                return null;
            }

            if (!contenuDeSeance) {
                contenuDeSeance = aFaire.contenuDeSeance;
            }

            if (aFaire) {
                const { donneLe, effectue, contenu, documents } = aFaire;
                return {
                    id: id,
                    type: "task",
                    subjectCode: codeMatiere,
                    subject: matiere,
                    addDate: donneLe,
                    isInterrogation: interrogation,
                    isDone: effectue,
                    teacher: nomProf,
                    content: contenu,
                    files: documents.map((e) => (new File(e.id, e.type, e.libelle))),
                    sessionContent: contenuDeSeance.contenu,
                    sessionContentFiles: contenuDeSeance.documents.map((e) => (new File(e.id, e.type, e.libelle)))
                }
            }
            else {
                return {
                    id: id,
                    type: "sessionContent",
                    subjectCode: codeMatiere,
                    subject: matiere,
                    addDate: day[0],
                    teacher: nomProf,
                    sessionContent: contenuDeSeance.contenu,
                    sessionContentFiles: contenuDeSeance.documents.map((e) => (new File(e.id, e.type, e.libelle)))
                }
            }
        }).filter((item) => item)]
    }))
    return sortedHomeworks;
}

export function sortMessageFolders(messages, oldMessageFolders, origin = 0) {
    let sortedMessageFolders = messages.classeurs.filter((folder) => (oldMessageFolders === undefined || !oldMessageFolders.some((oldFolder) => oldFolder.id === folder.id))).map((folder) => {
        return {
            id: folder.id,
            name: folder.libelle,
            fetchInitiated: false,
            fetched: origin === folder.id
        }
    });
    if (oldMessageFolders === undefined) {
        sortedMessageFolders.unshift({
            id: 0,
            name: "Boîte de réception",
            fetchInitiated: true,
            fetched: origin === 0
        })
    } else {
        const updatedOldFolders = oldMessageFolders.map((folder) => {
             const newFolder = { ...folder };
             if (newFolder.id === origin) {
                 newFolder.fetched = true;
             }
             return newFolder;
        });
        sortedMessageFolders.unshift(updatedOldFolders);
        sortedMessageFolders = sortedMessageFolders.flat();
    }
    if (!sortedMessageFolders.some((folder) => folder.id === -1)) {
        sortedMessageFolders.push({
            id: -1,
            name: "Envoyés",
            fetchInitiated: false,
            fetched: origin === -1
        })
    }
    if (!sortedMessageFolders.some((folder) => folder.id === -2)) {
        sortedMessageFolders.push({
            id: -2,
            name: "Archivés",
            fetchInitiated: false,
            fetched: origin === -2
        })
    }
    if (!sortedMessageFolders.some((folder) => folder.id === -3)) {
        sortedMessageFolders.push({
            id: -3,
            name: "Nouveau dossier",
            fetchInitiated: true,
            fetched: true
        })
    }
    if (!sortedMessageFolders.some((folder) => folder.id === -4)) {
        sortedMessageFolders.push({
            id: -4,
            name: "Brouillons",
            fetchInitiated: false,
            fetched: origin === -4
        })
    }

    return sortedMessageFolders;
}

export function sortMessages(messages, type) {
    let sortedMessages = [];
    if (type === "received") {
        sortedMessages = messages.messages.received.map((message) => {
            return {
                date: message.date,
                files: structuredClone(message.files)?.map((file) => new File(file.id, file.type, file.libelle)),
                from: message.from,
                id: message.id,
                folderId: message.idClasseur,
                read: message.read,
                subject: message.subject,
                content: null,
            }
        });
    } else if (type === "sent") {
        sortedMessages = messages.messages.sent.map((message) => {
            return {
                date: message.date,
                files: structuredClone(message.files)?.map((file) => new File(file.id, file.type, file.libelle)),
                from: message.from,
                id: message.id,
                folderId: -1,
                read: message.read,
                subject: message.subject,
                content: null,
            }
        });
    }
    else if (type === "archived") {
        sortedMessages = messages.messages.archived.map((message) => {
            return {
                date: message.date,
                files: structuredClone(message.files)?.map((file) => new File(file.id, file.type, file.libelle)),
                from: message.from,
                id: message.id,
                folderId: -2,
                read: message.read,
                subject: message.subject,
                content: null,
            }
        });
    }
    else if (type === "draft") {
        sortedMessages = messages.messages.draft.map((message) => {
            return {
                date: message.date,
                files: structuredClone(message.files)?.map((file) => new File(file.id, file.type, file.libelle)),
                from: message.from,
                id: message.id,
                folderId: -4,
                read: message.read,
                subject: message.subject,
                content: null,
            }
        });
    }

    return sortedMessages;
}

export function sortMessageContent(messageContent, oldSortedMessages) {
    if (!messageContent || !oldSortedMessages) {
        return oldSortedMessages;
    }
    const newSortedMessages = [...oldSortedMessages];
    const targetMessageIdx = newSortedMessages.findIndex((item) => item.id === messageContent.id);
    if (targetMessageIdx !== -1) {
        newSortedMessages[targetMessageIdx] = {
            ...newSortedMessages[targetMessageIdx],
            read: true,
            files: messageContent.files.map((file) => new File(file.id, file.type, file.libelle)),
            content: {
                id: messageContent.id,
                subject: messageContent.subject,
                date: messageContent.subject,
                content: messageContent.content
            }
        };
    }
    return newSortedMessages;
}

export function sortSchoolLife(schoolLife, activeAccount) {
    const sortedSchoolLife = {
        delays: [],
        absences: [],
        sanctions: [],
        incidents: []
    };
    if (schoolLife && schoolLife[activeAccount]) {
        schoolLife[activeAccount].absencesRetards.concat(schoolLife[activeAccount].sanctionsEncouragements ?? []).forEach((item) => {
            const newItem = {};
            newItem.type = item.typeElement;
            newItem.id = item.id;
            newItem.isJustified = item.justifie;
            newItem.date = new Date(item.date);
            newItem.displayDate = item.displayDate;
            newItem.duration = item.libelle;
            newItem.reason = item.motif;
            newItem.comment = item.commentaire;
            newItem.todo = item.aFaire;
            newItem.by = item.par;
            switch (newItem.type) {
                case "Retard":
                    sortedSchoolLife.delays.push(newItem);
                    break;
                case "Absence":
                    sortedSchoolLife.absences.push(newItem);
                    break;
                case "Punition":
                    sortedSchoolLife.sanctions.push(newItem);
                    break;
                case "Incident":
                    sortedSchoolLife.incidents.push(newItem);
                    break;
                default:
                    break;
            }
        });
    }
    return sortedSchoolLife;
}
