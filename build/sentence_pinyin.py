"""Pinyin for example sentences (shared by every level). Same heuristics as the original HSK 5 build."""
import re
import jieba
from pypinyin import lazy_pinyin, Style

CJK = re.compile(r"[一-鿿]")
NEUTRAL = dict(re.findall(r"(\S+?)=(.+?)(?=\s+\S+=|\s*$)", """东西=dōngxi 妻子=qīzi 时候=shíhou 喜欢=xǐhuan 妈妈=māma 爸爸=bàba 爷爷=yéye
奶奶=nǎinai 哥哥=gēge 姐姐=jiějie 弟弟=dìdi 妹妹=mèimei 朋友=péngyou 先生=xiānsheng 学生=xuésheng 衣服=yīfu
事情=shìqing 漂亮=piàoliang 便宜=piányi 告诉=gàosu 觉得=juéde 认识=rènshi 休息=xiūxi 明白=míngbai 清楚=qīngchu
舒服=shūfu 地方=dìfang 意思=yìsi 头发=tóufa 眼睛=yǎnjing 耳朵=ěrduo 晚上=wǎnshang 早上=zǎoshang 关系=guānxi
聪明=cōngming 月亮=yuèliang 故事=gùshi 名字=míngzi 客气=kèqi 记得=jìde 叔叔=shūshu 行李=xíngli 星星=xīngxing
看看=kànkan 谈谈=tántan 试试=shìshi 走走=zǒuzou 坐坐=zuòzuo 一下=yíxià 一个=yí gè 一次=yí cì 一位=yí wèi 一定=yídìng
一样=yíyàng 一共=yígòng 一切=yíqiè 一会儿=yíhuìr 一块=yí kuài 一件=yí jiàn 一半=yíbàn 一遍=yí biàn 一份=yí fèn
一起=yìqǐ 一直=yìzhí 一些=yìxiē 一边=yìbiān 一般=yìbān 一点儿=yìdiǎnr 一家=yì jiā 一条=yì tiáo 一种=yì zhǒng
一张=yì zhāng 一名=yì míng 一本=yì běn 一天=yì tiān 一年=yì nián 一把=yì bǎ 一只=yì zhī 一场=yì chǎng
一台=yì tái 一瓶=yì píng 一篇=yì piān 一所=yì suǒ 一座=yí zuò 一辆=yí liàng 一部=yí bù 一句话=yí jù huà 一封=yì fēng
一生=yìshēng 一双=yì shuāng 一口=yì kǒu 一些人=yìxiē rén 不是=bú shì 不会=bú huì 不要=bú yào 不用=bú yòng
不对=bú duì 不够=bú gòu 不太=bú tài 不到=bú dào 不去=bú qù 不过=búguò 不但=búdàn 不错=búcuò 不在=bú zài
不愿意=bú yuànyì 不认识=bú rènshi 不看=bú kàn 不像=bú xiàng 不大=bú dà 不再=bú zài 不见=bú jiàn 不客气=bú kèqi
还是=háishi 怎么=zěnme 那么=nàme 这么=zhème 多么=duōme 我们=wǒmen 你们=nǐmen 他们=tāmen 她们=tāmen 什么=shénme
人们=rénmen 孩子们=háizimen 同学们=tóngxuémen 上面=shàngmian 里面=lǐmian 外面=wàimian 前面=qiánmian
后面=hòumian 下面=xiàmian 桌子上=zhuōzi shang 得到=dédào 长得=zhǎng de 教=jiāo 还=hái 只=zhǐ
种=zhǒng 为=wèi 干=gàn 重=zhòng 好=hǎo 着=zhe 了=le 行=xíng 当=dāng 少=shǎo 空=kōng 倒=dào 都=dōu 要=yào
最长=zuì cháng 长时间=cháng shíjiān 睡不着=shuì bu zháo 照片=zhàopiàn 变得=biànde 不小心=bù xiǎoxīn
中=zhōng 难=nán 发=fā 应=yīng 相=xiāng 乐=lè 得=de 地=de 长=cháng 谢谢=xièxie 儿子=érzi 椅子=yǐzi 桌子=zhuōzi""".replace("\n", " ")))
jieba.add_word("不小心")
jieba.del_word("心切")


def _tok_py(t, prev, nxt, wpy):
    if t == "得" and (prev == "" or prev[-1] in "我你他她们，了才就还也都"):
        return "děi"
    if t == "长" and nxt[:1] in "得满着在了出大":
        return "zhǎng"
    if t == "种" and not (prev[-1:] in "一二两三四五六七八九十几这那各每多哪"):
        return "zhòng"
    if t == "只" and prev[-1:] in "一二两三四五六七八九十几这那每":
        return "zhī"
    if t == "为" and prev[-1:] in "他她称成作认以":
        return "wéi"
    if t == "干" and nxt[:1] in "了净燥":
        return "gān"
    if t in NEUTRAL:
        return NEUTRAL[t]
    if t in wpy:
        return wpy[t]
    syl = lazy_pinyin(t, style=Style.TONE)
    if t.endswith("儿") and len(t) > 1:
        syl = syl[:-2] + [syl[-2] + "r"]
    p = syl[0]
    for s in syl[1:]:
        p += ("'" if s[0] in "aeoāáǎàēéěèōóǒò" else "") + s
    return p


def sentence_pinyin(zh, h, hpy, wpy):
    toks = []
    for i, piece in enumerate(zh.split(h)):          # keep the target word as its own token
        if i:
            toks.append(h)
        toks += jieba.lcut(piece, HMM=False)
    toks = [t for t in toks if t]
    out = []
    for i, t in enumerate(toks):
        if not CJK.search(t):
            out.append(t)
            continue
        out.append(hpy if t == h else _tok_py(t, toks[i - 1] if i else "", toks[i + 1] if i + 1 < len(toks) else "", wpy))
    s = " ".join(out)
    s = s.translate(str.maketrans("，。！？；：（）", ",.!?;:()")).replace("、", ",")
    s = re.sub(r"\s+([，。！？、；：,.!?”’）])", r"\1", s)
    s = re.sub(r"([“‘（])\s+", r"\1", s)
    return s[:1].upper() + s[1:]
