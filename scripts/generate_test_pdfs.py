from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))


def footer(canvas, document):
    canvas.saveState()
    canvas.setFont("STSong-Light", 9)
    canvas.setFillColor(HexColor("#78716c"))
    canvas.drawString(22 * mm, 14 * mm, "语证 Web App - 无敏感测试材料")
    canvas.drawRightString(188 * mm, 14 * mm, f"第 {document.page} 页")
    canvas.restoreState()


def build_pdf(filename, title, subtitle, pages):
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleCN", parent=styles["Title"], fontName="STSong-Light", fontSize=24, leading=34, alignment=TA_CENTER, textColor=HexColor("#1c1917"), spaceAfter=16)
    subtitle_style = ParagraphStyle("SubtitleCN", parent=styles["Normal"], fontName="STSong-Light", fontSize=11, leading=18, alignment=TA_CENTER, textColor=HexColor("#78716c"))
    heading_style = ParagraphStyle("HeadingCN", parent=styles["Heading1"], fontName="STSong-Light", fontSize=18, leading=26, textColor=HexColor("#92400e"), spaceAfter=14)
    body_style = ParagraphStyle("BodyCN", parent=styles["BodyText"], fontName="STSong-Light", fontSize=12, leading=23, firstLineIndent=24, textColor=HexColor("#292524"), spaceAfter=12)
    doc = SimpleDocTemplate(str(OUTPUT / filename), pagesize=A4, rightMargin=22 * mm, leftMargin=22 * mm, topMargin=24 * mm, bottomMargin=24 * mm, title=title, author="语证测试材料")
    story = [Spacer(1, 48 * mm), Paragraph(title, title_style), Paragraph(subtitle, subtitle_style)]
    for heading, paragraphs in pages:
        story.extend([PageBreak(), Paragraph(heading, heading_style)])
        story.extend(Paragraph(text, body_style) for text in paragraphs)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


build_pdf(
    "long_march_strategy_a.pdf",
    "长征战略意义测试材料 A",
    "侧重军事机动与战略主动权 - 仅供产品联调",
    [
        ("一、战略机动与主动权", ["转移并非单纯退却，而是为重新获得战略主动创造条件。通过改变行动区域，原有的不利态势得到调整，部队获得了重新选择方向和组织行动的空间。", "战略转移使分散力量获得重新组织的条件。机动为后续行动恢复了选择空间，也为保存核心力量提供了现实路径。"]),
        ("二、力量保存与组织重建", ["在持续行动中，组织体系经历了检验和调整。保存下来的核心力量成为后续发展的基础，组织重建则保证了战略目标能够继续推进。", "本材料只讨论军事与组织层面的测试观点，不包含真实课程结论。引用时应保留页码，并与原文逐项核对。"]),
    ],
)

build_pdf(
    "long_march_strategy_b.pdf",
    "长征战略意义测试材料 B",
    "侧重组织动员与社会联系 - 仅供产品联调",
    [
        ("一、传播与组织动员", ["沿途传播和组织工作扩大了社会联系。行动过程不仅包含军事移动，也伴随信息传播、群众沟通和基层组织建设。", "这些活动使不同区域之间形成新的联系，为后续的组织动员积累了经验。材料强调的是社会联系维度，而非对所有历史因素作完整解释。"]),
        ("二、长期影响与证据边界", ["组织动员的长期影响需要结合更多史料判断。单凭本测试材料，不能推断具体地区的全部社会变化，也不能替代正式历史研究。", "当系统缺少某一比较维度的原文时，应明确标记证据不足，不得凭常识补齐共同点。"]),
    ],
)

print(f"Generated PDFs in {OUTPUT}")
