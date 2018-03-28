//______________________________________________________________________________
// Rect class
function Rect(x, y, width, height, color) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	// 최대 / 최소 변값(이를 기준으로 ascending / desceding 한다.)
	this.maxlength = (width>height)? width:height;
	this.minlength = (width>height)? height:width;
	this.rotate = false;
	this.color = color;
	this.isSelect = false;
}

Rect.prototype.contains = function(r) {
	// 사각형이 지정된 사각형에 포함되어있는지 여부 
	// Does this rectangle contain the specified rectangle?
	return this.x <= r.x &&
				 this.y <= r.y &&
				 this.x + this.width >= r.x + r.width &&
				 this.y + this.height >= r.y + r.height;
};

Rect.prototype.disjointFrom = function(r) {
	// 사각형이 지정된 사각형과 떨어져있는지 여부
	// Is this rectangle disjoint from the specified rectangle?
	return this.x + this.width  <= r.x ||
				 this.y + this.height <= r.y ||
				 r.x + r.width  <= this.x ||
				 r.y + r.height <= this.y;
};

Rect.prototype.intersects = function(r) {
	// 사각형이 지정된 사각형과 교차하는지 여부
	// Does this rectangle intersect the specified rectangle?
	return !this.disjointFrom(r);
};

Rect.prototype.copy = function() {
	// 복제한 사각형을 리턴
	// Create a copy of this rectangle.
	return new Rect(this.x, this.y, this.width, this.height);
};

//______________________________________________________________________________
// BinPacker class

// Uses MAXRECTS-BSSF-BNF bin packer algorithm from
// https://github.com/juj/RectangleBinPack
// 
// MAXRECTS-BSSF-BNF stands for "Maximal Rectangles - Best Short Side Fit". It
// positions the rectangle against the short side of the free rectangle into
// which it fits most snugly.
// 자유 사각형들 중에서 짧은 면에 대해 사각형을 위치시키는 알고리즘

function BinPacker(width, height) {

	this.width = width;
	this.height = height;

	// TODO: Allow for flexible width or height. If a rectangle doesn't fit into
	//       the bin extend the width or height to accommodate it.

	// Array of rectangles representing the free space in the bin
	// 빈의 빈공간을 나타내는 직사각형 배열
	this.freeRectangles = [new Rect(0, 0, width, height)];

	// Array of rectangles positioned in the bin
	// 빈에 배치된 사각형의 배열
	this.positionedRectangles = [];

	// Array of rectangles that couldn't fit in the bin
	// 빈에 배치되지 못한 사각형의 배열
	this.unpositionedRectangles = [];

	this.methodType = 'BSSF';

}

BinPacker.prototype.insert = function(width, height) {
	
	// Insert a rectangle into the bin. 
	// 빈에 사각형을 삽입.
	// If the rectangle was successfully positioned, add it to the array of 
	// positioned rectangles and return an object with this information and the
	// rectangle object.
	// 사각형이 성공적으로 배치되었다면, positioned배열에 추가한다. 사각형 객체와 배치 정보를 담은 객체를 반환한다.
	// If the rectangle couldn't be positioned in the bin, add it to the array of
	// unpositioned rectangles and return an object with this information and the
	// rectangle object (which as undefined x- and y-properties.
	// 사각형을 빈에 배치할 수 없다면, unpositioned배열에 추가한다. 그리고 x와 y의 값이 undefined인 사각형객체와 배치정보를 담은 객체를 반환한다.
	// Find where to put the rectangle. Searches the array of free rectangles for
	// an open spot and returns one when it's found.
	// 사각형을 넣을 위치를 찾는다. 열린 자리를 찾고 발견되면 그 사각형을 반환한다.

	var r = BinPacker.findPosition(width, height, this.freeRectangles,this);

	// 포지셔닝 실패하면 unpositioned 배열에 사각형을 저장하고 리턴
	// Unpositioned rectangle (it has no x-property if it's unpositioned)
	if (r.x == undefined) {
		this.unpositionedRectangles.push(r);
		return  { positioned: false, rectangle: r };
	};

	// 새로운 직사각형이 위치한 곳을 기준으로 자유 사각형을 나눔.
	// Split the free rectangles based on where the new rectangle is positioned
	var n = this.freeRectangles.length;
	for (var i = 0; i < n; i++) {

		// splitRectangle()은 분할될 경우 직사각형들의 배열을 리턴한다. 분할되지 않으면 false를 리턴.
		// splitRectangle() returns an array of sub-rectangles if the rectangle
		// was split (which is truthy) and false otherwise
		if (new_rectangles = BinPacker.splitRectangle(this.freeRectangles[i], r)) {
			
			// remove the free rectangle that was split
			this.freeRectangles.splice(i, 1);

			// append new free rectangles formed by the split															// split
			this.freeRectangles = this.freeRectangles.concat(new_rectangles);

			--i; --n;

		}
	}

	BinPacker.pruneRectangles(this.freeRectangles);

	BinPacker.sortFreeRectangles(this.freeRectangles);
	console.log(this.freeRectangles);
	this.positionedRectangles.push(r);
	
	return { positioned: true, rectangle: r };

};

// 입력할 사각형을 자유사각형 중에서 가장 꽉찬 비율로 채울수 있는 사각형을 찾아 배치후(좌표 등록) 배치된 사각형을 리턴.
BinPacker.findPosition = function(width, height, F, bin) {
	console.log(bin.methodType);
	var result = this.method[bin.methodType](width,height,F,bin);
	return result;
};

BinPacker.splitRectangle = function(f, r) {

	// Splits the rectangle f into at most four sub-rectangles that are formed by 
	// taking the geometric difference of f from r and identifying the largest 
	// rectangles that can be formed from the resulting polygon. Returns these 
	// sub-rectangles if the f was split and false otherwise.
	// 매개변수 f의 사각형을 최대 4개의 직사각형으로 분할.
	// r과 f의 기하학적 차이를 취하여 가장 큰 것을 구한다.
	// 생성된 다각형으로 부터 직사각형을 형성한다.(f가 쪼게지면 직사각형이고 그렇지 않다면 false를 반환)

	// If they are disjoint then no splitting can be done, return false
	// 입력된 사각형r과 자유사각형이 겹쳐있는경우 분할을 실행하지 않는다.
	if (r.disjointFrom(f)) return false;

	var new_rectangles = [];

	// Does f contain r in terms of the x-axis?
	// 자유사각형은 x축의 관점에서 입력된 사각형 r을 포함하는지?
	if (r.x < f.x + f.width && f.x < r.x + r.width) {

		// QUESTION: Does this make an assumption about how r is positioned relative
		//           to f? Couldn't it be that part of r could be outside of f in
		//           this first if-statement? It looks like this assumes r will be 
		//           placed along one of the edges (which, in fact, is what this
		//           algorithm does).

		// TODO: Look into all of this in more depth. I don't fully understand why
		//       these conditionals are the way they are.

		// New rectangle is above r
		if (f.y < r.y && r.y < f.y + f.height) {
			var new_rectangle = f.copy();
			new_rectangle.height = r.y - new_rectangle.y;
			new_rectangles.push(new_rectangle);
		}

		// New rectangle is below r
		if (r.y + r.height < f.y + f.height) {
			var new_rectangle = f.copy();
			new_rectangle.y = r.y + r.height;
			new_rectangle.height = f.y + f.height - (r.y + r.height);
			new_rectangles.push(new_rectangle);
		}
		
	}
	// 자유사각형은 y축의 관점에서 입력된 사각형 r을 포함하는지?
	// Does f contain r in terms of the y-axis?
	if (r.y < f.y + f.height && f.y < r.y + r.height) {

		// New rectangle is to the left of r
		if (f.x < r.x && r.x < f.x + f.width) {
			var new_rectangle = f.copy();
			new_rectangle.width = r.x - new_rectangle.x;
			new_rectangles.push(new_rectangle);
		}

		// New rectangle is to the right of r
		if (r.x + r.width < f.x + f.width) {
			var new_rectangle = f.copy();
			new_rectangle.x = r.x + r.width;
			new_rectangle.width = f.x + f.width - (r.x + r.width);
			new_rectangles.push(new_rectangle);
		}

	}

	return new_rectangles;

};

BinPacker.pruneRectangles = function(F) {
	// Go through the array of rectangles, F, and remove any that are 
	// completely contained within another rectangle in F
	for (var i = 0; i < F.length; i++) {
		for (var j = i + 1; j < F.length; j++) {
			if (F[j].contains(F[i])) {
				F.splice(i, 1);
				--i;
				break;
			}
			if (F[i].contains(F[j])) {
				F.splice(j, 1);
				--j;
			}
		}
	}
};

BinPacker.sortFreeRectangles = function(F){
	// 자유 사각형을 y좌표 오름차순으로 정렬한다.(좌하단 자유사각형 공간부터 채워지는 것을 방지하기 위함).
	F.sort(function(a,b){
		return a.y-b.y;
	});
};

BinPacker.method = {
	BSSF:function(width,height,F,bin){
		console.log('bssf method');
		// Decide where to position a rectangle (with side lengths specified by width
		// and height) within the bin. The bin's free space is defined in the array
		// of free rectangles, F.
		// 사각형의 위치를 결정한다(너비에 의해 지정되는면)

		var bestRectangle = new Rect(undefined, undefined, width, height);
		var bestShortSideFit = Number.MAX_VALUE,
				bestLongSideFit = Number.MAX_VALUE;
		
		var isPositioned = false; // 배치여부 플래그
		// Find the free rectangle into which this rectangle fits inside most snugly 
		// (i.e., the one with the smallest amount of space leftover after positioning 
		// the rectangle inside of it)
		for (var i = 0; i < F.length; i++) {
			var f = F[i]; // the current free rectangle
			// Does the rectangle we are positioning fit inside the free rectangle?
			// 배치할 사각형이 현재 검색중인 자유사각형에 들어맞는지 여부 확인(자유사각형의 가로/세로보다 배치할 사각형의 가로/세로가 작야야 함)
			// if (f.width >= width && f.height >= height) {
			// 	var leftoverHorizontal = Math.abs(f.width - width), // 사각형을 채웠을 경우 남은 가로값.
			// 			leftoverVertical   = Math.abs(f.height - height); // 사각형을 채웠을 경우 남은 세로값.
			// 	var shortSideFit = Math.min(leftoverHorizontal, leftoverVertical), // 남은 값중 최소값
			// 			longSideFit = Math.max(leftoverHorizontal, leftoverVertical); // 남은 값중 최대값
			// 	// Does this free rectangle have the smallest amount of space leftover
			// 	// after positioning?
			// 	// 이 자유사각형에 남은 공간이 가장 적은지 여부 확인. 가장 적다면 포지셔닝 한다.
			// 	// 1. 전 사각형에서 저장된 shortSideFit보다 현재 shortSideFit이 더 작다면(남는공간이 적다는뜻) 현재껄로 채택
			// 	// 2. 전 사각형에서 저장된 shortSideFit보다 현재 shortSideFit이 작지 안은경우에는 , 전 s와 현재 s가 같으면서 longSideFit이 전 사각형 longSideFit보다 작을 경우만(전 자유사각형보다 공간을 꽉채운다고 판단) 채택
			// 	if (shortSideFit < bestShortSideFit || (shortSideFit == bestShortSideFit && longSideFit < bestLongSideFit)) {
			// 		// Position rectangle in the bottom-left corner of the free rectangle
			// 		// (or top-left if the y-axis is inverted like in browsers)
			// 		bestRectangle.x = f.x;
			// 		bestRectangle.y = f.y;
			// 		bestShortSideFit = shortSideFit;
			// 		bestLongSideFit = longSideFit;
			// 		// isPositioned = true;
			// 	}
			// }
			// 정방향 입력 
			if(f.width>=width && f.height>=height){
				var leftoverHorizontal = Math.abs(f.width - width); // 사각형을 자유사각형에 채우고 남은 가로값.
				var leftoverVertical	 = Math.abs(f.height-height); // 사각형을 자유사각형에 채우고 남은 세로값.
				var shortSideFit = Math.min(leftoverHorizontal,leftoverVertical);
				var longSideFit = Math.max(leftoverHorizontal,leftoverVertical);
				if (shortSideFit < bestShortSideFit || (shortSideFit == bestShortSideFit && longSideFit < bestLongSideFit)) {
					bestRectangle.x = f.x;
					bestRectangle.y = f.y;
					bestShortSideFit = shortSideFit;
					bestLongSideFit = longSideFit;
					isPositioned = true;
				}
			}
			// 아이템을 회전 case
			// if(f.width>=height && f.height>=width){
			// 	console.log(3);
			// 	var rotateWidth = height;
			// 	var rotateHeight = width;
			// 	var rotateShortSideFit = Math.abs(f.width-rotateWidth);
			// 	var rotateLongSideFit   = Math.abs(f.height-rotateHeight);
			// 	if(rotateShortSideFit<bestShortSideFit || (rotateShortSideFit==bestShortSideFit && rotateLongSideFit < bestLongSideFit)){
			// 		console.log(4);
			// 		bestRectangle.x = f.x;
			// 		bestRectangle.y = f.y;
			// 		bestRectangle.width = rotateWidth;
			// 		bestRectangle.height = rotateHeight;
			// 		bestRectangle.rotate = true;
			// 		bestShortSideFit = rotateShortSideFit;
			// 		bestLongSideFit = rotateLongSideFit;
			// 	}
			// }
			// MaxRects - BSSF란 현재 bin의 남은공간(자유 사각형들)에 대해서 입력할 사각형이 가장 꽉찬 비율로 채울수 있는 공간(자유사각형)을 찾아 배치하는 것이다.
		}
		// 배치가 안된 경우, 가로 세로 값을 바꿔서 다시 시도한다.(오브젝트 90도 회전 후 입력 case)
		if(!isPositioned){
			var newWidth = height;
			var newHeight = width;
			var bestRectangle = new Rect(undefined,undefined,newWidth,newHeight);
			for (var i = 0; i < F.length; i++) {
				var f = F[i]; // the current free rectangle
				if(f.width >= newWidth && f.height >= newHeight){
					var leftoverHorizontal = Math.abs(f.width - newWidth),
							leftoverVertical   = Math.abs(f.height - newHeight);
					var shortSideFit = Math.min(leftoverHorizontal, leftoverVertical),
							longSideFit = Math.max(leftoverHorizontal, leftoverVertical);
					if (shortSideFit < bestShortSideFit || (shortSideFit == bestShortSideFit && longSideFit < bestLongSideFit)) {
						bestRectangle.x = f.x;
						bestRectangle.y = f.y;
						bestShortSideFit = shortSideFit;
						bestLongSideFit = longSideFit;
						bestRectangle.rotate = true;
					}
				}
				if(bestRectangle.x) isPositioned=true;
			}
		}
		return bestRectangle;
	},
	BLSF:function(width,height,F,bin){
		console.log('blsf method');
		var bestRectangle = new Rect(undefined, undefined, width, height);
		var bestShortSideFit = Number.MAX_VALUE,
				bestLongSideFit = Number.MAX_VALUE;
		var isPositioned = false; // 배치여부 플래그

		for (var i = 0; i < F.length; i++) {
			var f = F[i]; // the current free rectangle
			if(f.width>=width && f.height>=height){
				var leftoverHorizontal = Math.abs(f.width - width); // 사각형을 자유사각형에 채우고 남은 가로값.
				var leftoverVertical	 = Math.abs(f.height-height); // 사각형을 자유사각형에 채우고 남은 세로값.
				var shortSideFit = Math.min(leftoverHorizontal,leftoverVertical);
				var longSideFit = Math.max(leftoverHorizontal,leftoverVertical);
				if (longSideFit < bestLongSideFit || (longSideFit == bestLongSideFit && shortSideFit < bestShortSideFit)) {
					bestRectangle.x = f.x;
					bestRectangle.y = f.y;
					bestShortSideFit = shortSideFit;
					bestLongSideFit = longSideFit;
					isPositioned = true;
				}
			}
		}
		return bestRectangle;
	},
	BSAF:function(width,height,F,bin){
		console.log('bsaf method');
		var bestRectangle = new Rect(undefined, undefined, width, height);

		var bestShortSideFit = Number.MAX_VALUE,
				bestAreaFit = Number.MAX_VALUE;

		var isPositioned = false; // 배치여부 플래그

		for (var i = 0; i < F.length; i++) {
			var f = F[i]; // the current free rectangle
			
			var areaFit = f.width * f.height - width * height;

			if(f.width>=width && f.height>=height){
				
				var leftoverHorizontal = Math.abs(f.width - width); // 사각형을 자유사각형에 채우고 남은 가로값.
				var leftoverVertical	 = Math.abs(f.height-height); // 사각형을 자유사각형에 채우고 남은 세로값.
				var shortSideFit = Math.min(leftoverHorizontal,leftoverVertical);

				if (areaFit < bestAreaFit || (areaFit == bestAreaFit && shortSideFit < bestShortSideFit)) {
					bestRectangle.x = f.x;
					bestRectangle.y = f.y;
					bestShortSideFit = shortSideFit;
					bestAreaFit = areaFit;
					isPositioned = true;
				}
			}
		}
		return bestRectangle;
	},
	BL:function(width,height,F,bin){
		console.log('bl method');
		var bestRectangle = new Rect(undefined, undefined, width, height);
		var bestX = Number.MAX_VALUE,
				bestY = Number.MAX_VALUE;
		var isPositioned = false; // 배치여부 플래그
		for (var i = 0; i < F.length; i++) {
			var f = F[i]; // the current free rectangle
			if(f.width>=width && f.height>=height){
				var topSideY = f.y + height;
				if (topSideY < bestY || (topSideY == bestY && f.x < bestX)) {
					bestRectangle.x = f.x;
					bestRectangle.y = f.y;
					bestX = f.x;
					bestY = topSideY;
					isPositioned = true;
				}
			}
			// 배치 안된 경우 90도 회전하여 다시 시도 해본다.
			if(!isPositioned){
				if(f.width>=height && f.height>=width){
					var rotateWidth = height;
					var rotateHeight = width;
					var rotateTopSideY = f.y + rotateHeight;
					if(rotateTopSideY < bestY || (rotateTopSideY==bestY && f.x<bestX)){
						bestRectangle.x = f.x;
						bestRectangle.y = f.y;
						bestRectangle.width = rotateWidth;
						bestRectangle.height = rotateHeight;
						bestX = f.x;
						bestRectangle.rotate = true;
						bestY = topSideY;
						isPositioned = true;
					}
				}
			}
		}
		return bestRectangle;
	},
	CP:function(width,height,F,bin){
		
		console.log('cp method');
		console.log(bin.positionedRectangles);
		
		var bestRectangle = new Rect(undefined, undefined, width, height);
		var usedBoxes = bin.positionedRectangles;

		function  CommonIntervalLength(i1start,i1end,i2start,i2end){
			if (i1end < i2start || i2end < i1start){	
				return 0;
			}
			return Math.min(i1end, i2end) - Math.max(i1start, i2start);
		}
	
		function ContactPointScoreNode(x,y,width,height){
			var score = 0;
		
			if (x == 0 || x + width == bin.width){
				score += height;
			}

			if (y == 0 || y + height == bin.height){
				score += width;
			}
		
			for(var i=0; i<usedBoxes.length; i++){
				if (usedBoxes[i].x == x + width || usedBoxes[i].x + usedBoxes[i].width == x){
					score += CommonIntervalLength(usedBoxes[i].y, usedBoxes[i].y + usedBoxes[i].height, y, y + height);
				}
				if (usedBoxes[i].y == y + height || usedBoxes[i].y + usedBoxes[i].height == y){
					score += CommonIntervalLength(usedBoxes[i].x, usedBoxes[i].x + usedBoxes[i].width, x, x + width);
				}
			}
			return score;
		}

		var bestContactScore = -1;
		for (var i=0; i<F.length; i++){
			var f = F[i];
			if (f.width >= width && f.height >= height){
				var score = ContactPointScoreNode(f.x, f.y, width, height);
				if (score > bestContactScore){
					bestRectangle.x = f.x;
					bestRectangle.y = f.y;
					bestContactScore = score;
				}
			}
		}
		return bestRectangle;
	}
};

function BinPack(binWidth,binHeight) {
	
	// var binWidth = 800,
	// 		binHeight = 800;
	
	var rectWidth = function(d) { return d.width; },
			rectHeight = function(d) { return d.height; };
	
	var sort = false;

	var binPacker = new BinPacker(binWidth, binHeight);

	var pack = {};

	pack.add = function(d) {
		var o = binPacker.insert(rectWidth(d), rectHeight(d));
		o.rectangle.datum = d;
		return pack;
	};

	pack.addAll = function(array) {
		if (sort) array.sort(sort);
		array.forEach(function(d, i) {
			var o = binPacker.insert(rectWidth(d), rectHeight(d));
			o.rectangle.datum = d;
		});
		// 90도 회전 고려 rotate 값을 줘야 함
		// if(pack.unpositioned.length>0){
		// 	console.log('fail');
		// 	console.log(pack.unpositioned);
		// 	var failRect = pack.unpositioned[0];
		// 	var newRect = new Rect(0,0,failRect.height,failRect.width);
		// 	pack.add(newRect);
		// }
		return pack;
	};

	pack.binWidth = function(_) {
		if (!arguments.length) return binWidth;
		binWidth = _;
		binPacker = new BinPacker(binWidth, binHeight);
		return pack;
	};

	pack.binHeight = function(_) {
		if (!arguments.length) return binHeight;
		binHeight = _;
		binPacker = new BinPacker(binWidth, binHeight);
		return pack;
	};

	pack.rectWidth = function(_) {
		return arguments.length ? (rectWidth = _, pack) : rectWidth;
	};

	pack.rectHeight = function(_) {
		return arguments.length ? (rectHeight = _, pack) : rectHeight;
	};

	pack.sort = function(_) {
		return arguments.length ? (sort = _, pack) : sort;
	};

	pack.reset = function(){
		binPacker.positionedRectangles=[];
		binPacker.unpositionedRectangles=[];
		binPacker.freeRectangles = [new Rect(0, 0, binWidth, binHeight)];
		return pack;
	};

	pack.selectMethod = function(method){
		console.log(binPacker);
		binPacker.methodType = method;
	};

	Object.defineProperty(pack, "positioned", {
		get: function() { return binPacker.positionedRectangles; }
	});

	Object.defineProperty(pack, "unpositioned", {
		get: function() { return binPacker.unpositionedRectangles; }
	});

	Object.defineProperty(pack, "freeposition", {
		get: function() { return binPacker.freeRectangles; }
	});

	return pack;
	
}