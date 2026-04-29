import styles from "./TimeSlider.module.css";

import Slider from "../slider/Slider";
import { useEffect, useState } from "react";

const MINUTES_IN_DAY = 24 * 60;

type Props = {
    minutes: number;
    step: number;
    onChange:(minutes: number) => void;
}

function _minutesToPercent(minutes: number) {
    let sliderValue = Math.round(minutes / (MINUTES_IN_DAY - 1) * 100);
    if (sliderValue < 0) { 
        sliderValue = 0;
    } else if (sliderValue > 100) {
        sliderValue = 100;
    }
    return sliderValue;
}

function _percentToMinutes(percent:number, step:number) {
    let minutes = percent / 100 * (MINUTES_IN_DAY - 1);
    minutes = Math.round(minutes / step) * step;
    if (minutes >= MINUTES_IN_DAY) minutes = MINUTES_IN_DAY-1;
    return minutes;
}

function TimeSlider(props:Props) {
    const { minutes, step, onChange } = props;
    const [displayMinutes, setDisplayMinutes] = useState(minutes);
    const percent = _minutesToPercent(minutes);

    useEffect(() => {
      setDisplayMinutes(minutes);
    }, [minutes, setDisplayMinutes]);

    return (
        <div className={styles.container}>
            <div className={styles.slider}>
                <span className={styles.firstMidnight}>midnight</span>
                <span className={styles.sixAm}>6am</span>
                <span className={styles.noon}>noon</span>
                <span className={styles.sixPm}>6pm</span>
                <span className={styles.secondMidnight}>midnight</span>
                <Slider
                    value={percent}
                    onUpdate={(nextValue) => {
                        setDisplayMinutes(_percentToMinutes(nextValue, step));
                        onChange(_percentToMinutes(nextValue, step));
                    }}
                />
            </div>
            <div className={styles.timeText}>{`${Math.floor(displayMinutes/60)}:${(displayMinutes%60).toString().padStart(2, '0')}`}</div>
        </div>
    );
}

export default TimeSlider;