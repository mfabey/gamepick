from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, subprocess, sys, json
import numpy as np

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'render-deps'))
import imageio_ffmpeg
W,H,FPS,DURATION=1080,1920,30,19.2
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
motion_dir=ROOT/'motion-frames'
motion_dir.mkdir(exist_ok=True)
if not (motion_dir/'000246.jpg').exists():
    subprocess.run([ffmpeg,'-y','-v','error','-i',str(ROOT/'story-input/home-motion.mp4'),'-vf','fps=30,scale=526:1169','-t','8.2','-q:v','2',str(motion_dir/'%06d.jpg')],check=True)
motion_frames=sorted(motion_dir.glob('*.jpg'))
FONT=Path('C:/Windows/Fonts')
def font(size,bold=False): return ImageFont.truetype(str(FONT/('segoeuib.ttf' if bold else 'segoeui.ttf')),size)
def text(draw,xy,s,size=38,fill='#F4F4F6',bold=False):
    draw.text(xy,s,font=font(size,bold),fill=fill,anchor='lt')
def rounded(size,r,fill,outline=None,width=1):
    im=Image.new('RGBA',size);d=ImageDraw.Draw(im);d.rounded_rectangle((0,0,size[0]-1,size[1]-1),r,fill,outline,width);return im
def paste(im,layer,x,y,alpha=1):
    if alpha<.999:
        layer=layer.copy();layer.putalpha(layer.getchannel('A').point(lambda v:int(v*max(0,alpha))))
    im.alpha_composite(layer,(int(x),int(y)))
def ease(x): return 1-(1-max(0,min(1,x)))**3

xx,yy=np.meshgrid(np.arange(W),np.arange(H))
glow=np.exp(-(((xx-540)/600)**2+((yy-1100)/900)**2)*2)
bg=np.zeros((H,W,4),dtype=np.uint8)
for c,base,delta in [(0,10,14),(1,11,3),(2,13,5)]:bg[:,:,c]=base+glow*delta
bg[:,:,3]=255
background=Image.fromarray(bg)
draw=ImageDraw.Draw(background)
logo=Image.open(ROOT/'story-input/logo.png').convert('RGBA')
# Trim only empty margins from the real logo for a small brand signature.
logo=logo.crop((208,200,848,848));logo.thumbnail((49,49),Image.Resampling.LANCZOS)
paste(background,logo,72,220)
text(draw,(139,232),'GAMERISEN',27,bold=True)
text(draw,(816,235),'YENİ SÜRÜM',22,'#FF6B6F',True)
text(draw,(72,1693),'gamerisen.com',28,'#A1A3AB')
draw.line((72,1764,1008,1764),fill='#292B32',width=3)

scenes=[
 (0,4.2,'home','Yeni görünüm. Aynı oyun tutkusu.','YENİ TASARIM','Sade. Akıcı. Sana yakın.','Yenilenen arayüzle keşfetmeye başla.',72),
 (4.2,4,'discover','Sıradaki oyunun seni bekliyor.','SANA ÖZEL','Zevkine göre oyunlar.','İlgini çeken oyunları tek yerde keşfet.',328),
 (8.2,4,'price','Karşılaştır. Fırsatı yakala.','GELİŞTİRİLEN ÖZELLİK','Daha fazla mağaza.','Oyun fiyatlarını yan yana karşılaştır.',72),
 (12.2,4,'community','Oyunlar güzel. Birlikte daha güzel.','OYUNCU TOPLULUĞU','Keşfet. Paylaş. Sohbet et.','Oyun tutkununu toplulukla paylaş.',328),
 (16.2,3,'home','Gamerisen yenilendi.','ŞİMDİ KEŞFET','Yeni sürüme geç.','Bir sonraki oyununu birlikte bulalım.',200),
]
screens={}
for name in ['home','discover','price','community']:
    pic=Image.open(ROOT/f'story-input/{name}.jpg').convert('RGBA').resize((526,1169),Image.Resampling.LANCZOS)
    mask=Image.new('L',pic.size);ImageDraw.Draw(mask).rounded_rectangle((0,0,525,1168),radius=44,fill=255)
    pic.putalpha(mask);screens[name]=pic
phone=Image.new('RGBA',(610,1300));pd=ImageDraw.Draw(phone)
shadow=Image.new('RGBA',(610,1300));ImageDraw.Draw(shadow).rounded_rectangle((26,38,581,1256),66,fill='#00000070');shadow=shadow.filter(ImageFilter.GaussianBlur(18));paste(phone,shadow,0,0)
pd.rounded_rectangle((26,20,581,1238),64,fill='#17191D',outline='#52555D',width=2)
pd.rounded_rectangle((22,270,27,350),3,fill='#454850')
pd.rounded_rectangle((580,320,586,438),3,fill='#454850')

cards=[];headlines=[]
for at,dur,name,headline,label,head,sub,x in scenes:
    card=Image.new('RGBA',(728,256))
    shadow=Image.new('RGBA',(728,256));ImageDraw.Draw(shadow).rounded_rectangle((24,29,703,226),26,fill='#00000070');shadow=shadow.filter(ImageFilter.GaussianBlur(12));paste(card,shadow,0,0)
    box=rounded((680,198),26,'#181A20','#383B43',2);bd=ImageDraw.Draw(box)
    bd.rounded_rectangle((0,25,4,171),2,fill='#E8242B')
    text(bd,(29,25),label,20,'#FF6B6F',True)
    text(bd,(29,68),head,36,bold=True)
    text(bd,(29,129),sub,27,'#B9BBC4')
    paste(card,box,24,16);cards.append(card)
    title=Image.new('RGBA',(940,92));td=ImageDraw.Draw(title);size=48
    while td.textlength(headline,font=font(size,True))>936:size-=1
    text(td,(0,0),headline,size,bold=True);headlines.append(title)
cta=rounded((390,74),22,'#D01A21');cd=ImageDraw.Draw(cta)
s='Yeni sürümü keşfet  →';tw=cd.textlength(s,font=font(27,True));text(cd,((390-tw)/2,21),s,27,bold=True)

def render(t):
    i=max(k for k,s in enumerate(scenes) if t>=s[0]);at,dur,name,*_=scenes[i];local=t-at
    im=background.copy()
    entrance=ease(t/.85)
    py=421+(1-entrance)*65+math.sin(t*.65)*5
    device=phone.copy()
    screen=screens[name]
    if t<8.2:
        screen=Image.open(motion_frames[min(int(t*30),len(motion_frames)-1)]).convert('RGBA')
        screen.putalpha(screens['home'].getchannel('A'))
    elif i>0 and local<.38:screen=Image.blend(screens[scenes[i-1][2]],screen,ease(local/.38))
    paste(device,screen,41,44)
    dd=ImageDraw.Draw(device);dd.ellipse((294,56,312,74),fill='#050608')
    paste(im,device,235,py,entrance)
    titleAlpha=min(ease(local/.4),max(0,(dur-local)/.2))
    paste(im,headlines[i],72,321+(1-ease(local/.5))*15,titleAlpha)
    pop=local-.7
    if pop>=0:
        amount=ease(pop/.5);exitA=min(1,max(0,(dur-local-.1)/.25));alpha=amount*exitA
        scale=.965+.035*amount
        card=cards[i]
        if scale<.999:card=card.resize((round(card.width*scale),round(card.height*scale)),Image.Resampling.BICUBIC)
        paste(im,card,scenes[i][-1]-24,1320+32*(1-amount),alpha)
    if i==4:paste(im,cta,618,1664+12*(1-ease(local/.5)),ease(local/.5))
    d=ImageDraw.Draw(im);d.line((72,1764,72+936*min(1,t/DURATION),1764),fill='#E8242B',width=3)
    return im.convert('RGB')

out=ROOT/'gamerisen-story-video-1080x1920.mp4'
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
cmd=[ffmpeg,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','1080x1920','-r','30','-i','-',
     '-i',str(ROOT/'story-input/music.wav'),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',
     '-af','volume=4','-c:a','aac','-b:a','192k','-ar','44100','-t',str(DURATION),'-movflags','+faststart',str(out)]
with open(ROOT/'render.log','w') as log:
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
    for frame in range(round(DURATION*FPS)):
        pic=render(frame/FPS)
        proc.stdin.write(pic.tobytes())
        if frame in [60,180,300,420,546]:pic.save(ROOT/f'video-check-{frame}.jpg',quality=93)
        if frame%90==0:print(f'{frame}/{round(DURATION*FPS)} frames',flush=True)
    proc.stdin.close();code=proc.wait()
    if code:raise RuntimeError(f'ffmpeg failed: {code}')
print(json.dumps({'file':str(out),'duration':DURATION,'width':W,'height':H,'fps':FPS,'frames':576}),flush=True)
