import wave, math, struct, random
random.seed(7)
sr=44100
duration=19.2
length=int(sr*duration)
left=[0.0]*length
right=[0.0]*length
def tone(start,dur,hz,amp,pan=0.0,pluck=False):
    begin=int(start*sr)
    count=min(int(dur*sr),length-begin)
    for j in range(count):
        t=j/sr
        env=(1-math.exp(-t*35))*math.exp(-t*(3.0 if pluck else .5))*min(1,(dur-t)/.25)
        v=(math.sin(2*math.pi*hz*t)+.18*math.sin(2*math.pi*hz*2*t)) * env*amp
        left[begin+j]+=v*(1-pan*.3)
        right[begin+j]+=v*(1+pan*.3)
# Original understated electronic bed. 100 BPM, four soft chord blocks.
chords=[[220,261.626,329.628,493.883],[174.614,220,261.626,329.628], [130.813,196,261.626,329.628],[195.998,246.942,293.665,391.995]]
for k,chord in enumerate(chords):
    start=k*4.8
    for i,hz in enumerate(chord): tone(start,4.8,hz,.025,(i-1.5)/1.5)
    for n in range(8): tone(start+n*.6,1.1,chord[(n*3)%4]*2,.022,(-1)**n,True)
for beat in range(32):
    begin=int(beat*.6*sr)
    for j in range(min(int(.18*sr),length-begin)):
        t=j/sr
        kick=.065*math.sin(2*math.pi*(49*t+7*(1-math.exp(-t*25))))*math.exp(-t*25)
        left[begin+j]+=kick;right[begin+j]+=kick
with wave.open('music.wav','wb') as out:
    out.setnchannels(2);out.setsampwidth(2);out.setframerate(sr)
    data=bytearray()
    for i in range(length):
        fade=min(1,i/sr/.6,(duration-i/sr)/1.0)
        data.extend(struct.pack('<hh',int(max(-1,min(1,left[i]*fade))*32767),int(max(-1,min(1,right[i]*fade))*32767)))
    out.writeframes(data)
