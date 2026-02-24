/**
 * 图书馆书册加载点：依赖 book1.js～book5.js 已加载，提供 LIBRARY_BOOKS 与 LIBRARY_BOOK_CONTENT
 * 五本书标题：庭院角色、世界观、镜子、黑之书、白之书
 */
(function () {
    "use strict";

    window.LIBRARY_BOOKS = [
        { id: "book1", cover: "assets/ui/bc1.webp", title: "庭院角色" },
        { id: "book2", cover: "assets/ui/bc2.webp", title: "世界观" },
        { id: "book3", cover: "assets/ui/bc3.webp", title: "镜子" },
        { id: "book4", cover: "assets/ui/bc4.webp", title: "黑之书" },
        { id: "book5", cover: "assets/ui/bc5.webp", title: "白之书" }
    ];

    window.LIBRARY_BOOK_CONTENT = {
        book1: (typeof window.LIBRARY_BOOK_1 !== "undefined") ? window.LIBRARY_BOOK_1 : [],
        book2: (typeof window.LIBRARY_BOOK_2 !== "undefined") ? window.LIBRARY_BOOK_2 : [],
        book3: (typeof window.LIBRARY_BOOK_3 !== "undefined") ? window.LIBRARY_BOOK_3 : [],
        book4: (typeof window.LIBRARY_BOOK_4 !== "undefined") ? window.LIBRARY_BOOK_4 : [],
        book5: (typeof window.LIBRARY_BOOK_5 !== "undefined") ? window.LIBRARY_BOOK_5 : []
    };
})();
