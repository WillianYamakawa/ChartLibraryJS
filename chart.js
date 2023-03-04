function prepareChart(obj, id, data) {
    obj.id = id;
    obj.canvas = $('#' + obj.id).get(0);
    obj.ctx = obj.canvas.getContext('2d');
    const bound = obj.canvas.getBoundingClientRect();
    console.log(bound)
    var scale = window.devicePixelRatio;
    obj.scale = scale;
    obj.canvas.width = bound.width * scale;
    obj.canvas.height = bound.height * scale;
    obj.ctx.scale(scale, scale);
    obj.width = bound.width;
    obj.height = bound.height;
    obj.data = data;
}

const convertHexToRGBA = (hex, opacity) => {
    const tempHex = hex.replace('#', '');
    const r = parseInt(tempHex.substring(0, 2), 16);
    const g = parseInt(tempHex.substring(2, 4), 16);
    const b = parseInt(tempHex.substring(4, 6), 16);

    return `rgba(${r},${g},${b},${opacity})`;
};

function normalizeData(list, max, min) {
    const diff = max - min;
    return list.map(el => {
        return 1 - (el + -min) / diff;
    })
}

function getOriginNormalized(max, min) {
    return 1 - -min / (max - min);
}

function getLabelsWidths(ctx, labels) {
    const widths = [];
    for (let i = 0; i < labels.length; i++) {
        widths.push(ctx.measureText(labels[i].toString()).width);
    }
    return widths;
}

function getNearest10toX(num) {
    let power = 0;
    let i = 0
    while (true) {
        const pow = Math.pow(10, i)
        if (pow < num) {
            power = pow
            i++
        } else {
            break
        }
    }
    i = 0;
    if (power == 0) {
        while (true) {
            const pow2 = Math.pow(10, -i)
            if (pow2 < num) {
                power = pow2
                break
            } else {
                i++
            }
        }
    }
    return power
}

function prettifyOutput(output) {
    let val = output + output * 0.0001;

    let str = val.toString();
    if (str.indexOf('.') != -1) {
        let idx = 0;
        for (let i = 0; i < str.length; i++) {
            if (!['0', '.', ','].includes(str[i])) {
                idx = i;
                break;
            }
        }
        val = Number(str.slice(0, Math.min(str.length, idx + str.startsWith('-') == -1 ? 4 : 5)))
    }
    return val
}

function roundToX(value, gap, toGreater) {
    let res = 0;
    if (value == 0) {
        if (toGreater) {
            return gap
        } else {
            return -gap
        }
    }
    let isNegative = value < 0;
    if (isNegative) {
        toGreater = !toGreater;
    }
    value = Math.abs(value);
    if (toGreater) {
        let i = 0;
        while (true) {
            const possibleValue = gap * i;
            const considerValue = value + value * 0.00005;
            if (possibleValue <= considerValue) {
                i++;
            } else {
                res = possibleValue;
                break;
            }
        }
    } else {
        let i = 0;
        let last = gap;
        while (true) {
            const possibleValue = gap * i;
            const considerValue = value - value * 0.00005;
            if (possibleValue < considerValue) {
                last = possibleValue;
                i++;
            } else {
                res = last;
                break;
            }
        }
    }
    return isNegative ? -res : res;
}

function getBestFit(value, desiredTicks, power, adder = 0) {
    const ticksList = [
        { ticks: Math.ceil(value / (power / 4)) + adder, value: power / 4 },
        { ticks: Math.ceil(value / (power / 2)) + adder, value: power / 2 },
        { ticks: Math.ceil(value / power) + adder, value: power },
        { ticks: Math.ceil(value / (power * 2)) + adder, value: power * 2 },
        { ticks: Math.ceil(value / (power * 4)) + adder, value: power * 4 },
    ]

    let diff = Math.abs(ticksList[0].ticks - desiredTicks);
    let gap = ticksList[0];

    for (let i = 0; i < ticksList.length; i++) {
        let d = Math.abs(ticksList[i].ticks - desiredTicks);
        if (d < diff) {
            gap = ticksList[i];
            diff = d;
        }
    }

    return gap
}

function getLeftLabels(min, max, desired = 6, maintainZero = false) {
    const DESIRED = desired;
    if (maintainZero) {
        if (max < 0) {
            max = 0;
        }
        if (min > 0) {
            min = 0;
        }
    }
    const diff = Math.abs(max - min);
    if (!diff) {
        return [0, 1]
    }
    const value = Math.abs(diff);

    const power = getNearest10toX(value);
    const gap = getBestFit(value, DESIRED - 3, power);

    const realMax = roundToX(max, gap.value, true);
    const realMin = roundToX(min, gap.value, false);

    const ticks = (realMax - realMin) / gap.value

    const labels = []

    for (let i = 0; i < ticks + 1; i++) {
        let val = gap.value * i + realMin;
        if (maintainZero && min >= 0) {
            if (val < 0) {
                continue
            }
        }
        if (maintainZero && max <= 0) {
            if (val > 0) {
                continue
            }
        }
        labels.push(prettifyOutput(val));
    }

    return labels
}

function drawLeftLabels(ctx, height, leftLabels, marginLeft, marginBottom, marginTop) {
    const actualHeight = height - marginBottom - marginTop;
    const widths = getLabelsWidths(ctx, leftLabels);
    const startY = marginTop;
    const gap = actualHeight / (leftLabels.length - 1);
    const pos = []
    for (let i = 0; i < leftLabels.length; i++) {
        const x = marginLeft - widths[widths.length - 1 - i];
        const y = (startY + gap * i);
        ctx.fillText(leftLabels[leftLabels.length - 1 - i], x, y + 5);
        pos.push(y);
    }
    return pos;
}

function drawBottomLabels(ctx, labels, marginLeft, totalWidth, totalHeight) {
    let marginBottom = Math.max(15, totalHeight * 0.04);
    const width = totalWidth - marginLeft;
    const xs = labels.length * 2;
    const horizontalMargin = 40;
    const xsWidth = (width - horizontalMargin * 2) / xs;
    const widths = getLabelsWidths(ctx, labels);

    const positonsX = []

    ctx.fillStyle = "white";
    let hasOverflowed = false;
    for (let i = 0; i < widths.length; i++) {
        if (i != 0) {
            if (widths[i] / 2 + widths[i - 1] / 2 > xsWidth * 2 - 20) {
                hasOverflowed = true;
            }
        }

        if (i != widths.length - 1) {
            if (widths[i] / 2 + widths[i + 1] / 2 > xsWidth * 2 - 20) {
                hasOverflowed = true;
            }
        }
    }
    let xHolder = 0;
    if (hasOverflowed) {
        const maxYLength = Math.max(...widths.map(el => Math.sin(Math.PI / 8) * el + 15));
        for (let i = 0; i < labels.length; i++) {
            const quantity = ((i == 0) ? 1 : 2);
            const x = (horizontalMargin + (xHolder + quantity) * xsWidth) + marginLeft;
            xHolder += quantity;
            const txt = labels[i];
            ctx.save();
            ctx.translate(x, totalHeight - maxYLength)
            ctx.rotate(Math.PI / 8);
            ctx.fillText(txt, 0,
                0);
            ctx.restore();
            positonsX.push(x);
        }
        marginBottom = maxYLength
    } else {
        for (let i = 0; i < labels.length; i++) {
            const quantity = ((i == 0) ? 1 : 2);
            const txt = labels[i];
            const txtWidth = widths[i];
            const x = (horizontalMargin + (xHolder + quantity) * xsWidth) + marginLeft;
            xHolder += quantity;
            ctx.fillText(txt, x - txtWidth / 2, totalHeight - marginBottom);
            positonsX.push(x);
        }
        marginBottom += 10
    }
    return { marginBottom: marginBottom + totalHeight * 0.04, positionsX: positonsX };
}

function drawHeader(obj, ctx) {
    const marginTopnBottom = obj.height * 0.02
    let offsetTitle = 0;
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    const title = obj.data.title;
    if (title) {
        ctx.save();
        ctx.textBaseline = "top";
        const font = Math.max(14, Math.min(16, obj.width / 40))
        ctx.font = font + "px Arial";
        const widthTitle = ctx.measureText(title).width;
        ctx.fillText(title, obj.width / 2 - widthTitle / 2, marginTopnBottom + 5);
        offsetTitle = font + 9;
        ctx.restore();
    }

    const content = obj.data.data;
    if (!content.length) {
        return;
    }
    const marginHorizontal = 15;
    const marginVertical = 15;
    const marginText = 10;
    const squareWidth = Math.min(45, obj.width * 0.05);
    const squareHeight = Math.min(20, obj.height * 0.05);
    const blocksWidths = []

    for (let i = 0; i < content.length; i++) {
        const text = content[i].title;
        const textWidth = ctx.measureText(text).width;
        blocksWidths.push(marginHorizontal * 2 + marginText + squareWidth + textWidth);
    }

    const lines = [];
    lines.push([])
    const maxWidth = obj.width * 0.8;
    let currentLine = 0;
    let currentLineWidth = 0;

    for (let i = 0; i < blocksWidths.length; i++) {
        const item = blocksWidths[i]
        if (currentLineWidth + item > maxWidth) {
            lines.push([])
            currentLine++;
            currentLineWidth = 0;
        }
        lines[currentLine].push({ width: item, text: obj.data.data[i].title, color: obj.data.data[i].color, strokeWidth: obj.data.data[i].strokeWidth, stroke: obj.data.data[i].stroke });
        currentLineWidth += item;
    }

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        let xOffset = 0;
        let yOffset = (lineIdx * (squareHeight + marginVertical)) + marginTopnBottom + offsetTitle + squareHeight / 2;
        const xStart = (obj.width / 2) - (lines[lineIdx].reduce((acc, el) => acc += el.width, 0) / 2);

        for (let blockIdx = 0; blockIdx < lines[lineIdx].length; blockIdx++) {
            ctx.fillStyle = lines[lineIdx][blockIdx].color ?? "#1B93D8";
            ctx.lineWidth = lines[lineIdx][blockIdx].strokeWidth ?? 3;
            ctx.strokeStyle = lines[lineIdx][blockIdx].stroke ?? "#1B93D800";
            ctx.beginPath();
            ctx.roundRect(xStart + xOffset + marginHorizontal, yOffset, squareWidth, squareHeight, obj.data.radius ?? 0);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "white";
            ctx.fillText(lines[lineIdx][blockIdx].text, xStart + xOffset + squareWidth + marginText + marginHorizontal, yOffset + squareHeight / 2)
            xOffset += lines[lineIdx][blockIdx].width;
        }
    }

    return lines.length * (squareHeight + marginVertical) + marginTopnBottom * 2 + offsetTitle + 5;
}

class BarChart {

    static instances = []

    constructor(id, data) {
        prepareChart(this, id, data)
        this.draw(this.ctx);
    }

    draw(ctx) {
        const MARGIN_RIGHT = 20;
        ctx.fillStyle = '#161a20';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.letterSpacing = "1px";
        ctx.fillStyle = "white";
        ctx.font = Math.max(12, Math.min(14, this.width / 40)) + "px Arial";
        const marginTop = drawHeader(this, ctx);
        const minValue = Math.min(...this.data.data.map(el => Math.min(...el.values) ?? 0));
        const maxValue = Math.max(...this.data.data.map(el => Math.max(...el.values) ?? 0));
        let desiredTicks = Math.floor(Math.max(2, this.height / 60));
        const leftLabels = getLeftLabels(minValue, maxValue, desiredTicks, true);
        const marginLeft = Math.max(...getLabelsWidths(ctx, leftLabels)) + 15;
        const horizontalLabels = this.data.labels.map(el => {
            let label = el;
            if (label.length > 30) {
                label = label.slice(0, 27) + "...";
            }
            return label;
        })

        const { marginBottom, positionsX } = drawBottomLabels(ctx, horizontalLabels, marginLeft, this.width, this.height);
        const positonsY = drawLeftLabels(ctx, this.height, leftLabels, marginLeft, marginBottom, marginTop);
        this.drawBackground(ctx, this.width, positonsY, MARGIN_RIGHT, marginLeft, positionsX)
        const normalized = this.data.data.map(el => normalizeData(el.values, Math.max(...leftLabels), Math.min(...leftLabels)));
        const originNormalized = getOriginNormalized(Math.max(...leftLabels), Math.min(...leftLabels));
        const boxes = this.drawContent(ctx, originNormalized, normalized, positionsX, marginTop, marginBottom, marginLeft, MARGIN_RIGHT);
        this.detectHover(boxes);
    }

    detectHover(boxes) {
        $(this.canvas).on("mousemove."+this.id, el => {

            const bound = this.canvas.getBoundingClientRect();
            const mx = el.clientX - bound.left;
            const my = el.clientY - bound.top;
            const element = $("#crtI" + this.id);
            element.css({ opacity: 0, top: 0, left: 0 })

            for (let i = 0; i < boxes.length; i++) {
                if (mx > boxes[i].x && my > boxes[i].y && mx < boxes[i].x + boxes[i].width && my < boxes[i].y + boxes[i].height) {
                    if (element.length) {
                        element.css({ opacity: 1 })
                        const boundEl = element.get(0).getBoundingClientRect();
                        element.css({ top: my + bound.top - 40 + window.scrollY, left: window.scrollX + (boxes[i].x + bound.left) < window.innerWidth / 2 ? mx + bound.left + 30 : mx - boundEl.width + bound.left - 30 })
                        element.children("h2").text(boxes[i].title);
                        element.children("p").text("Valor: " + boxes[i].value);
                    } else {
                        $(document.body).append(`<div id="crtI${this.id}" style=";position:absolute;left:${mx + bound.left + 30}px;top:${my + bound.top - 40}px;user-select:none;background:#FAF9F6;padding: 15px;border-radius: 7px;box-shadow: rgba(106, 106, 106, 0.062) 0px 5px 15px;"><h2 style="margin-bottom: 10px">${boxes[i].title}</h2><p>Valor: ${boxes[i].value}</p></div>`)
                    }
                }
            }
        })
    }

    drawBackground(ctx, width, locations, marginRight, marginLeft, positionsX) {
        ctx.strokeStyle = "#ffffff15";
        ctx.fillStyle = "#ffffff15";
        ctx.lineWidth = 1;
        for (let i = 0; i < locations.length; i++) {
            ctx.beginPath();
            const y = locations[i];
            ctx.moveTo(marginLeft + 7, y);
            ctx.lineTo(width - marginRight, y);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(marginLeft + 17, 0 + locations[0] - 10);
        ctx.lineTo(marginLeft + 17, locations[locations.length - 1] + 10);
        ctx.stroke();
        if (positionsX.length > 1) {
            const gap = positionsX[1] - positionsX[0]
            for (let i = 0; i < positionsX.length - 1; i++) {
                ctx.beginPath();
                ctx.moveTo(positionsX[i] + gap/2, 0 + locations[0] - 10);
                ctx.lineTo(positionsX[i] + gap/2, locations[locations.length - 1] + 10);
                ctx.stroke();
            }
        }

    }

    drawContent(ctx, originNormalized, normalizedY, valuesX, marginTop, marginBottom, marginLeft, marginRight) {
        const boxes = [];

        ctx.save();
        ctx.translate(marginLeft, marginTop);
        const width = (this.width - marginLeft) - marginRight;
        const height = (this.height - marginBottom) - marginTop;

        //Transpose array
        const content = normalizedY[0].map((_, colIndex) => normalizedY.map(row => row[colIndex]));

        const origin = originNormalized * height;

        for (let i = 0; i < content.length; i++) {

            const xs = content[i].length * 2;
            let divWidth = width + -60;

            if (content.length >= 2) {
                divWidth = valuesX[1] - valuesX[0];
            }

            let xWidth = divWidth / xs;
            let offsetX = divWidth * i + 40;
            const barWidth = Math.min(100, xWidth - 5);

            for (let j = 0; j < content[i].length; j++) {
                offsetX += xWidth;
                ctx.fillStyle = this.data.data[j].color ?? "#1B93D833";
                ctx.strokeStyle = this.data.data[j].stroke ?? "#1B93D800";
                ctx.lineWidth = this.data.data[j].strokeWidth ?? 2;
                const x = offsetX;
                const y = content[i][j] * height;
                ctx.beginPath();
                ctx.roundRect(x - barWidth / 2, y, barWidth, origin - y, this.data.radius ?? 0);
                ctx.fill();
                ctx.stroke();

                offsetX += xWidth;

                if (origin > y) {
                    boxes.push({ x: x + marginLeft - barWidth / 2, y: y + marginTop, width: barWidth, height: origin - y, title: this.data.data[j].title, value: this.data.data[j].values[i] })
                } else {
                    boxes.push({ x: x + marginLeft - barWidth / 2, y: origin + marginTop, width: barWidth, height: Math.abs(origin - y), title: this.data.data[j].title, value: this.data.data[j].values[i] })
                }
            }
        }
        return boxes;
    }

    destroy(){
        $(this.canvas).off("."+this.id);
        BarChart.instances = BarChart.instances.filter(el => el != this);
    }

    static load(id, data){
        BarChart.instances.push(new BarChart(id, data))
    }

    static update(){
        BarChart.instances.forEach(el => {
            el.destroy();
            BarChart.load(el.id, el.data);
        })
    }
}

class LineChart {

    static instances = []

    constructor(id, data) {
        prepareChart(this, id, data);
        this.draw(this.ctx);
    }

    draw(ctx) {
        const MARGIN_RIGHT = this.width * 0.03;
        ctx.fillStyle = '#161a20';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.letterSpacing = "1px";
        ctx.fillStyle = "white";
        ctx.font = Math.max(12, Math.min(14, this.width / 40)) + "px Arial";
        const marginTop = drawHeader(this, ctx);
        const maxValue = Math.max(...this.data.data.map(el => Math.max(...el.values)));
        const minValue = Math.min(...this.data.data.map(el => Math.min(...el.values)))
        let desiredTicks = Math.min(15, Math.floor(Math.max(2, (this.height - marginTop) / 50)));
        const labels = getLeftLabels(minValue, maxValue, desiredTicks, false);
        const widths = getLabelsWidths(ctx, labels);
        const marginLeft = Math.max(...widths) + 15;
        const horizontalLabels = this.data.labels.map(el => {
            let label = el;
            if (label.length > 30) {
                label = label.slice(0, 27) + "...";
            }
            return label;
        })
        const { marginBottom, positionsX } = drawBottomLabels(ctx, horizontalLabels, marginLeft, this.width, this.height)
        const positionsY = drawLeftLabels(ctx, this.height, labels, marginLeft, marginBottom, marginTop);

        this.drawBackground(ctx, this.width, positionsX, positionsY, MARGIN_RIGHT, marginLeft)
        const points = this.drawContent(ctx, this.data.data.map(el => normalizeData(el.values, Math.max(...labels), Math.min(...labels))), positionsX, marginTop, marginBottom, marginLeft, MARGIN_RIGHT);

        this.detectHover(points)
    };

    detectHover(points) {
        if (!points.length) {
            return;
        }
        const obj = this;
        $(this.canvas).on("mousemove."+obj.id, function (el) {
            obj.mouseIsOver = true;
            const bound = obj.canvas.getBoundingClientRect();
            const mx = el.clientX - bound.left;
            const my = el.clientY - bound.top;
            const element = $("#crtI" + obj.id);

            let nearest = points[0];
            nearest.distance = Infinity;

            for (let i = 0; i < points.length; i++) {
                const distance = Math.hypot(mx - points[i].x, my - points[i].y);
                if (distance < nearest.distance) {
                    nearest = points[i];
                    nearest.distance = distance;
                }
            }

            if (element.length) {
                const boundEl = element.get(0).getBoundingClientRect();
                element.css({ opacity: 1 });
                element.css({ top: (nearest.y + bound.top) - boundEl.height / 2 + window.scrollY, left: window.scrollX + (nearest.x + bound.left) < window.innerWidth / 2 ? (nearest.x + bound.left) + 20 : (nearest.x + bound.left) - boundEl.width - 20 });
                element.children("h2").text(nearest.label);
                element.children("p").text("Valor: " + nearest.value);
                element.children("div").css({ background: nearest.color });
            } else {
                $(document.body).append(`<div id="crtI${obj.id}" style=";position:absolute;transition:.3s;left:${nearest.x + bound.left}px;top:${nearest.y + bound.top}px;user-select:none;background:#FAF9F6;padding: 15px;border-radius: 7px;box-shadow: rgba(106, 106, 106, 0.062) 0px 5px 15px;"><h2 style="margin-bottom: 10px;font-size:15px"></h2><div style="border-radius:5px;width:15px;height:15px;background:${nearest.color};margin:10px 0"></div><p>Valor:</p></div>`);
            }
        })

        $(this.canvas).on("mouseleave."+obj.id, function (el) {
            obj.mouseIsOver = false;
            setTimeout(() => {
                if (!obj.mouseIsOver) {
                    $("#crtI" + obj.id).css({ opacity: 0 });
                }
            }, 2000)
        })
    }

    drawBackground(ctx, width, locationsX, locationsY, marginRight, marginLeft) {
        ctx.strokeStyle = "#ffffff15";
        ctx.fillStyle = "#ffffff15";
        ctx.lineWidth = 1;
        for (let i = 0; i < locationsY.length; i++) {
            ctx.beginPath();
            const y = locationsY[i];
            ctx.moveTo(marginLeft + 7, y);
            ctx.lineTo(width - marginRight, y);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(marginLeft + 17, locationsY[0] - 10);
        ctx.lineTo(marginLeft + 17, locationsY[locationsY.length - 1] + 10);
        ctx.stroke();
        for (let i = 0; i < locationsX.length; i++) {
            ctx.beginPath();
            ctx.moveTo(locationsX[i], locationsY[0]);
            ctx.lineTo(locationsX[i], locationsY[locationsY.length - 1] + 10);
            ctx.stroke();
        }
    }



    drawContent(ctx, normalizedY, valuesX, marginTop, marginBottom, marginLeft, marginRight) {
        const points = []
        ctx.save();
        ctx.translate(marginLeft, marginTop);
        const height = (this.height - marginBottom) - marginTop;
        let lastXY = null;

        for (let i = 0; i < normalizedY.length; i++) {
            const color = this.data.data[i].color ?? "#1B93D8";

            ctx.lineWidth = this.data.data[i].strokeWidth ?? 2;
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            lastXY = null;

            for (let j = 0; j < normalizedY[i].length; j++) {
                const valueY = normalizedY[i][j]
                const x = valuesX[j] - marginLeft;
                const y = valueY * height;
                if (!this.data.data[i].hideCircle) {
                    ctx.beginPath();
                    ctx.arc(x, y, this.data.data[i].strokeWidth * 2 ?? 4, 0, 2 * Math.PI);
                    ctx.fill();

                }
                if (lastXY) {
                    ctx.beginPath();
                    ctx.moveTo(lastXY.x, lastXY.y);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                lastXY = { x: x, y: y };
                points.push({ x: x + marginLeft, y: y + marginTop, color: color, title: this.data.data[i].title, label: this.data.labels[j], value: this.data.data[i].values[j] });
            }
        }
        ctx.restore();
        return points;
    }

    destroy(){
        $(this.canvas).off("."+this.id);
        LineChart.instances = LineChart.instances.filter(el => el != this);
    }

    static load(id, data){
        LineChart.instances.push(new LineChart(id, data))
    }

    static update(){
        LineChart.instances.forEach(el => {
            el.destroy();
            LineChart.load(el.id, el.data);
        })
    }
}

$(window).on("resize", el => {
    BarChart.update();
    LineChart.update();
})

