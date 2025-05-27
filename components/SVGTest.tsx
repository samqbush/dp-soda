// Simple SVG test component to isolate SVG rendering issues
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

export function SVGTest() {
  console.log('🔍 SVGTest: Rendering basic SVG components');
  
  try {
    return (
      <View style={{ padding: 20, backgroundColor: '#f0f0f0', margin: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          SVG Test Component
        </Text>
        
        <Svg height="100" width="200" style={{ backgroundColor: '#fff' }}>
          <Rect
            x="10"
            y="10"
            width="80"
            height="30"
            fill="blue"
            stroke="black"
            strokeWidth="2"
          />
          
          <Circle
            cx="150"
            cy="25"
            r="20"
            fill="red"
            stroke="black"
            strokeWidth="2"
          />
          
          <SvgText
            x="50"
            y="70"
            fontSize="14"
            fill="black"
            textAnchor="middle"
          >
            SVG Works!
          </SvgText>
        </Svg>
        
        <Text style={{ marginTop: 10, color: 'green' }}>
          ✅ SVG rendering successful
        </Text>
      </View>
    );
  } catch (error) {
    console.error('🚨 SVGTest crashed:', error);
    return (
      <View style={{ padding: 20, backgroundColor: '#ffeeee', margin: 10 }}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>
          ❌ SVG Test Failed
        </Text>
        <Text style={{ color: 'red', marginTop: 5 }}>
          Error: {error?.toString()}
        </Text>
      </View>
    );
  }
}
