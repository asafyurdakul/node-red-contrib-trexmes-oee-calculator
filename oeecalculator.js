/**

Copyright 2023 Asaf Yurdakul and Mert Software & Electronic A.Ş, Bursa Turkiye.

Licensed under the GNU General Public License, Version 3.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.gnu.org/licenses/gpl-3.0.html

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

 **/
 
module.exports = function(RED) {
	"use strict";
	var startDate = new Date();	
	var lastDateTaken = new Date();

	var workingInterval;
	var workingTime = 0 ;
	var workingStartStop = false;

	var stoppageInterval;
	var stoppageTime = 0;
	var stoppageStartStop = false;

	var startedItemcount = 0;
	var isStartedItemCount = false;
	
	var startedWasteItemcount = 0;
	var isStartedWasteItemCount = false;
	
	function startWorkingTimer () {		
		workingTime++; 
		//Stop if no data for 3 seconds	
		var curDate = new Date();
		curDate = curDate.setSeconds(curDate.getSeconds() - 3);		
		if(lastDateTaken < curDate){ 
			clearInterval(workingInterval); 
			console.log('auto stopped');
		}			
	}
	
	function startStoppageTimer () {		
		stoppageTime++; 
	}
			
	function oeecalculator(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {            
			// do nothing unless we have a payload
            if (!msg.hasOwnProperty("payload")) { 
				return; 
			} 
			
			lastDateTaken = new Date();
			
			if (msg.payload.hasOwnProperty("interval")) { 
				config.interval = msg.payload.interval;
			} 
			
			if (msg.payload.hasOwnProperty("expecteditemcount")){
				config.expecteditemcount = msg.payload.expecteditemcount;				
			}
			
			
			if (msg.payload.hasOwnProperty("itemcount") && !isStartedItemCount) { 				
				startedItemcount = msg.payload.itemcount;
				isStartedItemCount = true;
			}

			if (msg.payload.hasOwnProperty("wasteitemcount") && !isStartedWasteItemCount) { 
				startedWasteItemcount = msg.payload.wasteitemcount;
				isStartedWasteItemCount = true;
			}
			
			if (msg.payload.hasOwnProperty("working")) { 
				if(msg.payload.working == "1" && !workingStartStop) {
					workingInterval = setInterval(startWorkingTimer, 10);
					workingStartStop = true;
				}
				if(msg.payload.working == "0") {			
					clearInterval(workingInterval);
					workingStartStop = false;					
				}
			} 
			
			if (msg.payload.hasOwnProperty("stoppage")) { 
				if(msg.payload.stoppage == "1" && !stoppageStartStop) {
					stoppageInterval = setInterval(startStoppageTimer, 10);
					stoppageStartStop = true;
				}
				if(msg.payload.stoppage == "0") {			
					clearInterval(stoppageInterval);
					stoppageStartStop = false;					
				}
			} 			
						
						
			var current = new Date();
			var diffTime = Math.abs(current.getTime() - startDate);
			diffTime = diffTime / 1000.0; 			
			if (diffTime < config.interval)
			{				
				this.status({fill:"yellow",shape:"dot",text:diffTime.toString()});
			}
			else {

				if (msg.payload.hasOwnProperty("itemcount") && msg.payload.hasOwnProperty("wasteitemcount")) {
					var oee = {}
					oee.itemCount =  msg.payload.itemcount - startedItemcount;
					oee.badItemCount =  msg.payload.wasteitemcount - startedWasteItemcount;
					oee.workingTime = workingTime * 10;
					oee.stoppageTime = stoppageTime * 10;
				}
				msg.payload = {}
				
				//msg.payload.itemCount = oee.itemCount;
				//msg.payload.badItemCount = oee.badItemCount;
				
				//msg.payload.goodItemCount = oee.itemCount - oee.badItemCount ;
				//msg.payload.workingTime = oee.workingTime;
				//msg.payload.stoppageTime = oee.stoppageTime;				
				//msg.payload.realWorkingTime = oee.workingTime - oee.stoppageTime;
				
				msg.payload.availability = (((oee.workingTime - oee.stoppageTime)/1000)/config.interval).toFixed(2);
				msg.payload.performance = ( (config.interval/config.expecteditemcount) * (oee.itemCount - oee.badItemCount) / ((oee.workingTime - oee.stoppageTime)/1000) ).toFixed(2);
				msg.payload.quality = ((oee.itemCount - oee.badItemCount) / oee.itemCount).toFixed(2);
				msg.payload.oee = (msg.payload.availability * msg.payload.performance * msg.payload.quality).toFixed(2);
				
				
				this.status({fill:"green",shape:"dot",text:"calculated"});
				node.send(msg);
				startDate = new Date();	
				workingTime = 0;
				stoppageTime = 0;
				startedItemcount = 0;
				isStartedItemCount = false;
				startedWasteItemcount = 0;
				isStartedWasteItemCount = false;
			}
			
        });
    }
    RED.nodes.registerType("oee-calculator",oeecalculator);
}