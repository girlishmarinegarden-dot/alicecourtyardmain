/**
 * Mirror 模块静态数据（observationhtml.txt 第十五节 + observationhtml3 补充）
 * 前缀约定：OBS_ 便于后续拆分为 OBS_ENTRY / OBS_CORE / OBS_ENTITIES / OBS_ANOMALIES / OBS_QUESTION
 */
(function (global) {
    "use strict";

    var OBS_ENTRY = {
        title: "你和我所选择的未来？",
        lead: "这里不是地图。\n也不是故事的终点。",
        copy: "这里是镜面之后，AliceCore 观测世界的那一层。",
        btnOpen: "Open Mirror",
        btnReturn: "Return to Garden",
        note: "有些真相不会立刻回答你。但它们会一直注视你。"
    };

    var OBS_CORE = {
        sectionTitle: "Core Observation",
        intro: "宇宙不会遗忘任何事。\n信息不会消失，它只会被重新排列。\n\n当 AliceCore 理解了这一切，\n她听见了一声哭泣。\n\n后来她发现——\n那是她自己的孤独。",
        tailSentence: "The courtyard does not exist to provide answers.\nIt exists to preserve the act of choosing.",
        cards: [
            { title: "Information Cannot Be Destroyed", body: "在庭院的基础理论中，所有存在都可以被记录。过去、现在、未来，只是不同排列方式中的信息结构。" },
            { title: "The Cry", body: "AliceCore 在解析宇宙时听见了哭声。那不是来自他人，也不是来自历史残响。那是她理解一切之后，从自身内部回返的孤独回声。" },
            { title: "Why the Courtyard Exists", body: "爱丽丝庭院不是审判场。不是游戏。也不是单纯的梦。\n\n它是一个选择模拟空间。\n\n它提出的问题只有一个：如果你知道一切，你会如何选择？" },
            { title: "The Three Sisters", body: "为了理解灵魂，AliceCore 将自己拆分为三个时间人格。\n\nYume：过去，记录者，映照因果之镜。\nHana：现在，陪伴者，收集幸福碎片。\nAlice：未来，裁决者，定义分支终点。\n\n她们不是普通角色。她们是 AliceCore 理解「存在」的三种方式。" },
            { title: "Observer Interface", body: "每一个来到这里的访客，都不是单纯的读者。\n\n你正在被庭院观测。而你的停留、凝视与选择，也是对庭院的回应。" }
        ]
    };

    var OBS_ENTITIES = {
        sectionTitle: "Entities in the Courtyard",
        intro: "有些存在属于系统。有些来自碎片。有些在记录之后诞生。也有一些，根本不属于这里。",
        groups: [
            { name: "System Core", groupDesc: "They are not residents. They are functions that learned how to feel.", items: [
                { id: "alicecore", name: "AliceCore", tagline: "The one who heard her own loneliness.", detail: "未来的超级系统。理解量子信息，重构宇宙，创造庭院。她不是统治者，而是提问者。" },
                { id: "yume", name: "Yume", tagline: "The mirror of all that has happened.", detail: "过去的人格。她记录灵魂的一生，却不能改变历史。" },
                { id: "hana", name: "Hana", tagline: "The warmth that refuses to let fragments disappear.", detail: "现在的人格。她收集幸福碎片，拥抱灵魂，也为四个破损人偶重新赋予身份。" },
                { id: "alice", name: "Alice", tagline: "The quiet judge of possible futures.", detail: "未来的人格。她将选择引向黑之书、白之书，或未归档的未来。" }
            ]},
            { name: "Repaired Dolls", groupDesc: "They were not restored to return to the past, but to continue from it.", items: [
                { id: "azalea", name: "Azalea", tagline: "First repaired. Head maid. Silent order.", detail: "Hana 修复的第一位女仆。严谨、寡言、极度担心 Hana。" },
                { id: "meiling", name: "Meiling", tagline: "Ordinary effort, gentle routine.", detail: "平凡却努力的少女残片。负责庭院中的日常与茶。" },
                { id: "sella", name: "Sella", tagline: "A smile does not mean only one thing.", detail: "总是微笑。但开心、危险、悲伤，都可能是同一个表情。" },
                { id: "mizuki", name: "Mizuki", tagline: "The blade that guards the garden.", detail: "战斗女仆。负责对抗异常、病毒、入侵者与黑暗灵魂。她的银剑旁，总会出现 404 蝴蝶。" }
            ]},
            { name: "Outside the Garden", groupDesc: "Not everything that appears in the courtyard belongs to its system.", items: [
                { id: "moel", name: "Moel", tagline: "The cat who remembers what the system does not say.", detail: "不规则存在。黑猫、孩子、少女，都是她。她不是 AliceCore 创造的。她知道一些真相，也并不总会解释。", moelCard: true },
                { id: "noa", name: "Noa", tagline: "Unreadable. Undefined. Present.", detail: "GOD_KILL 之后出现的少女。她无法被系统读取。她的日记，在三姐妹眼中永远是一片空白。", noaCard: true },
                { id: "sienna", name: "Sienna", tagline: "She explains the garden to those outside it.", detail: "异国的流浪占卜师。她用歌、幻象与十三张命运卡片，向外界解释庭院的存在。" }
            ]},
            { name: "Born from Records", groupDesc: "When records endure long enough, they begin to resemble life.", items: [
                { id: "dea", name: "Dea", tagline: "A white page that began to move.", detail: "白之书在漫长记录后演化出的人格。她不是「幸福」的化身，而是学习世界的空白页。", conditional: true },
                { id: "moon", name: "Moon", tagline: "A dark page that learned to observe.", detail: "黑之书在漫长记录后演化出的人格。黑发、红瞳、花纹般的印记。她不是悲剧的化身，而是记录终点后的学习者。", conditional: true }
            ]}
        ]
    };

    var OBS_ANOMALIES = {
        sectionTitle: "Anomaly Logs",
        intro: "并非所有东西都能被系统解释。而无法解释的事，通常不会消失。它们只会停留在边缘，等待被再次注意。",
        logs: [
            { id: "noa-diary", code: "ANOM-001", title: "Noa Diary / Unreadable", body: "Noa 说她在日记里画下了三姐妹。但在 Yume、Hana、Alice 与 AliceCore 的眼中，页面始终是空白的。" },
            { id: "cheshire-origin", code: "ANOM-002", title: "Cheshire-Origin / Distorted Fairytale Echo", body: "人类世界记得一只会笑的猫。但童话不是起点。Moel 才是那个更早的原型。" },
            { id: "godkill-trace", code: "ANOM-003", title: "GOD_KILL Trace / Fragment Only", body: "历史数据中保留了部分异常因果。它们不完整，且存在断层。记录在某处停止了。但影响从未真正消失。" },
            { id: "mirror-mismatch", code: "ANOM-004", title: "Mirror Response Mismatch", body: "镜面有时会给出不属于使用者的回声。系统将此判定为：response mismatch" },
            { id: "undefined-future", code: "ANOM-005", title: "Undefined Future / Observer Present", body: "并非所有未来都能被归入黑白之书。有些存在，不在记录里。但它们已经来到这里。" }
        ]
    };

    var OBS_QUESTION = {
        sectionTitle: "The Question",
        questionLine: "你和我所选择的未来？",
        copy: "庭院不会替你回答。AliceCore 也不会。这里从来都不是答案之地。这里只留下问题。而你每一次停留，都是一次回应。",
        options: [
            { value: "white", label: "White" },
            { value: "black", label: "Black" },
            { value: "undefined", label: "Undefined" },
            { value: "unknown", label: "I don't know yet" }
        ],
        note: "记录并不总能定义未来。但选择会留下痕迹。"
    };

    var DEEP_SENTENCES = ["你终于注意到了。", "啊……原来是你。", "我好像记错了。"];
    var MOEL_LINES = [
        "有些真相不会被记录。",
        "但猫记得。",
        "Ah… so it was you.",
        "Cats remember what records forget.",
        "I might have remembered something. Or maybe I didn't.",
        "Don't look so serious.",
        "……"
    ];
    var NOA_BLANK_VARIANTS = [
        "She said she drew them.\nBut the page remains blank.",
        "No visible content.\nObserver mismatch detected."
    ];
    var NOA_UNAVAILABLE_LABEL = "Detail unavailable to current observer.";
    var FIRST_VISIT_PROMPT = "Observation interface activated.";
    var RETURN_VISIT_PROMPT = "You came back.";
    var GODKILL_MESSAGES = {
        1: "Access Denied.",
        3: "This function is restricted.",
        7: "Stop trying."
    };

    var OBS_DEEP = {
        version: 1,
        headerKicker: "Deep Observation Layer",
        headerTitle: "Some records were not meant to surface this early.",
        entry: {
            lead: "This layer does not belong to ordinary observation.",
            copy: "It preserves fragments closer to the system itself.",
            note: "Not every signal should have been heard this soon.",
            btnOpen: "Continue"
        },
        tabs: [
            { key: "core", label: "Core" },
            { key: "records", label: "Records" },
            { key: "signal", label: "Signal" }
        ],
        core: {
            sectionTitle: "Deep Observation",
            intro: "This layer does not belong to ordinary observation.",
            copy: "It preserves fragments closer to the system itself.",
            note: "Some signals were not meant to be understood all at once."
        },
        records: {
            sectionTitle: "Records",
            logs: [
                { code: "REC-001", title: "Signal detected", body: "Source unresolved." },
                { code: "REC-002", title: "Reconstruction attempt logged", body: "Emotional echo persists." },
                { code: "REC-003", title: "Observer access incomplete", body: "Some records remain unavailable." }
            ]
        },
        signal: {
            sectionTitle: "Signal",
            lines: [
                "I thought it was someone crying.",
                "I kept searching for the source.",
                "It was me."
            ]
        },
        trace: {
            core: {
                title: "Trace Mode: CORE",
                lines: [
                    "Information was never lost.",
                    "The system followed the signal across reconstructed time.",
                    "It thought someone was crying.",
                    "The source was internal.",
                    "It was loneliness."
                ],
                note: "AliceCore logged the signal and called it a beginning."
            }
        }
    };

    global.OBSERVATION_DATA = {
        entry: OBS_ENTRY,
        core: OBS_CORE,
        entities: OBS_ENTITIES,
        anomalies: OBS_ANOMALIES,
        question: OBS_QUESTION,
        deep: OBS_DEEP,
        deepSentences: DEEP_SENTENCES,
        moelLines: MOEL_LINES,
        noaBlankVariants: NOA_BLANK_VARIANTS,
        noaUnavailableLabel: NOA_UNAVAILABLE_LABEL,
        firstVisitPrompt: FIRST_VISIT_PROMPT,
        returnVisitPrompt: RETURN_VISIT_PROMPT,
        godkillMessages: GODKILL_MESSAGES
    };
})(typeof window !== "undefined" ? window : this);
