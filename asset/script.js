// 学習アプリ用のDB
const db = new Dexie('PracticeAppDB');
// 学習進捗用のデータストア
db.version(1).stores({
    PracticeProgress: '++id, progress, datetime',
});

// 学習進捗のDAOオブジェクト
const PracticeProgressDao = {
    add: async (progress) => {
        await db.PracticeProgress.put({
            progress: progress,
            datetime: new Date(),
        })
    },
    delete: async (id) => {
        await db.PracticeProgress.where({
            id: id
        }).delete();
    },
    deleteOld: async (num) => {
        const list = await PracticeProgressDao.readAll();
        (list.slice(0, -num) ?? []).forEach(async e => {
            await PracticeProgressDao.delete(e.id);
        });
    },
    readAll: async () => {
        return await db.PracticeProgress.toArray();
    },
    readLatest: async () => {
        const list = await PracticeProgressDao.readAll();
        return list.slice(-1)[0] ?? null;
    }
};

// 学習進捗データ
let practiceProgressData;

// マスクブロッククリック時のアクションを定義するメソッド
const createMaskBlockAction = () => {
    $('mask-block, m-b').each((_, e) => {
        $(e).click(() => {
            if ($(e).hasClass('clicked')) {
                $(e).removeClass('clicked');
            } else {
                $(e).addClass('clicked');
            }
        });
    });
}

// h2、h3ヘッダーに一意なIDを付与するメソッド
const addHeaderId = () => {
    $('h2, h3').each((i, e) => {
        const id = `header-${i}`;
        $(e).attr('id', id);
    });
};

// h2、h3ヘッダーに「学習済み」チェックボックスを付与するメソッド
const addPracticeCompleteBox = () => {
    $('h2, h3').each((_, e) => {
        const id = $(e).attr('id');
        const text = $(e).text();
        $(e).text('');
        $(e).append($(`<span>${text}</span>`));
        const div = $('<div class="toggle-box-wrapper">');
        const box = $(`<input type='checkbox' id='toggle-complete-${id}' class='toggle-box' data-target='${id}'>`);
        box.prop('checked', practiceProgressData[id]);
        box.on('click', () => {
            practiceProgressData[id] = box.prop('checked');
            PracticeProgressDao.add(practiceProgressData);
        });
        box.on('change', () => {
            toggleContentTreeVisibility();
            updatePracticeProgress();
        });
        div.append(box);
        div.append($(`<label for='toggle-complete-${id}' class='toggle-box-label'>学習済み</label>`));
        $(e).append(div);
    });
};

// h2、h3ヘッダーからコンテンツツリーを作成するメソッド
const createContentTree = () => {
    let details = undefined;
    let ul = undefined;
    $('h2, h3').each((_, e) => {
        const id = $(e).attr('id');
        if ('H2' === $(e).prop('tagName')) {
            if (details) {
                details.append(ul);
                $('#page-tree').append(details);
            }
            details = $(`<details data-for-header='${id}'><summary><a href="#${id}">${$(e).children('span').text()}</a></summary></details>`);
            ul = $('<ul></ul>')
        } else if ('H3' === $(e).prop('tagName')) {
            if (ul) {
                ul.append($(`<li data-for-header='${id}'><a href="#${id}">${$(e).children('span').text()}</a></li>`));
            }
        }
    });
    if (details) {
        details.append(ul);
        $('#page-tree').append(details);
    }
};

// 学習進捗でコンテンツツリーの表示を切り替えるメソッド
const toggleContentTreeVisibility = () => {
    const checked = $('#toggle-show-complete-content').prop('checked');
    for (let id of Object.keys(practiceProgressData)) {
        if (id.startsWith('header-')) {
            if (practiceProgressData[id] && !checked) {
                $(`details[data-for-header="${id}"]`).hide();
                $(`li[data-for-header="${id}"]`).hide();
            } else {
                $(`details[data-for-header="${id}"]`).show();
                $(`li[data-for-header="${id}"]`).show();
            }
        }
    }
};

// 学習進捗を更新するメソッド
const updatePracticeProgress = () => {
    const total = $.makeArray($('h2, h3')).reduce((pv, cv) => pv + ($(cv).attr('id').startsWith('header-') ? 1 : 0), 0);
    const done = Object.values(practiceProgressData).reduce((pv, cv) => pv + (cv ? 1 : 0), 0);
    $('#practice-progress').text(`${done} / ${total}`);
};

// 学習進捗を初期化するメソッド
const initPracticeProgress = async () => {
    const option = window.confirm('学習進捗を初期化しますか？');
    if (option) {
        Object.keys(practiceProgressData).forEach(e => practiceProgressData[e] = false);
        await PracticeProgressDao.add(practiceProgressData);
        $.makeArray($('input')).filter(e => $(e).attr('id').startsWith('toggle-complete-') && $(e).prop('checked'))
            .forEach(e => $(e).prop('checked', false));
        toggleContentTreeVisibility();
        updatePracticeProgress();
    }
}

$(async () => {
    // 画面表示時に古い学習進捗は削除
    PracticeProgressDao.deleteOld(1000);

    // indexedDBに学習進捗が存在すればデータを取得
    practiceProgressData = (await PracticeProgressDao.readLatest())?.progress ?? {};
    console.log(practiceProgressData);

    createMaskBlockAction();
    addHeaderId();
    addPracticeCompleteBox();
    createContentTree();
    toggleContentTreeVisibility();
    updatePracticeProgress();
    $('#toggle-show-complete-content').on('change', toggleContentTreeVisibility);
    $('#reset-btn').on('click', initPracticeProgress);
});
